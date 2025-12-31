import secrets
from datetime import datetime, date, timedelta, UTC
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.social.interface import SocialInterface
from src.modules.social.models import (
    FriendshipStatus,
    ChallengeType,
    ChallengeStatus,
    LeaderboardType,
    LeaderboardPeriod,
    Friendship,
    FriendRequest,
    Follow,
    Challenge,
    ChallengeParticipant,
    LeaderboardEntry,
    Leaderboard,
    PublicUserProfile,
    ShareContent,
)
from src.modules.social.orm import (
    FriendshipORM,
    FollowORM,
    ChallengeORM,
    ChallengeParticipantORM,
)

if TYPE_CHECKING:
    from src.modules.profile.service import ProfileService
    from src.modules.progression.service import ProgressionService
    from src.modules.event_journal.service import EventJournalService


class SocialService(SocialInterface):
    """Implementation of the Social module."""

    def __init__(
        self,
        db: AsyncSession,
        profile_service: "ProfileService | None" = None,
        progression_service: "ProgressionService | None" = None,
        event_journal: "EventJournalService | None" = None,
    ):
        self._db = db
        self._profile = profile_service
        self._progression = progression_service
        self._event_journal = event_journal

    # =========================================================================
    # Friendships
    # =========================================================================

    async def send_friend_request(
        self,
        identity_id: str,
        friend_code: str | None = None,
        username: str | None = None,
    ) -> Friendship:
        """Send a friend request to another user."""
        if not friend_code and not username:
            raise ValueError("Either friend_code or username must be provided")

        # Find target user
        target_id = await self._find_user_id(friend_code, username)
        if not target_id:
            raise ValueError("User not found")

        if target_id == identity_id:
            raise ValueError("Cannot send friend request to yourself")

        # Check if friendship already exists
        existing = await self._get_friendship_record(identity_id, target_id)
        if existing:
            if existing.status == FriendshipStatus.BLOCKED:
                raise ValueError("Cannot send friend request to this user")
            if existing.status == FriendshipStatus.ACCEPTED:
                raise ValueError("Already friends with this user")
            if existing.status == FriendshipStatus.PENDING:
                # If they sent us a request, accept it
                if existing.requested_by == target_id:
                    return await self._accept_friendship(existing, identity_id)
                raise ValueError("Friend request already sent")

        # Create new friendship (ensure id_a < id_b)
        id_a, id_b = (identity_id, target_id) if identity_id < target_id else (target_id, identity_id)

        friendship_orm = FriendshipORM(
            id=str(uuid4()),
            identity_id_a=id_a,
            identity_id_b=id_b,
            status=FriendshipStatus.PENDING,
            requested_by=identity_id,
        )
        self._db.add(friendship_orm)
        await self._db.flush()

        # Record event
        await self._record_social_event(
            identity_id=identity_id,
            event_type="friend_request_sent",
            related_id=target_id,
            metadata={"target_id": target_id},
        )

        return await self._friendship_to_model(friendship_orm, identity_id)

    async def get_incoming_friend_requests(
        self,
        identity_id: str,
    ) -> list[FriendRequest]:
        """Get pending friend requests received by the user."""
        # Find friendships where this user is a/b but NOT the requester
        query = select(FriendshipORM).where(
            FriendshipORM.status == FriendshipStatus.PENDING,
            FriendshipORM.requested_by != identity_id,
            or_(
                FriendshipORM.identity_id_a == identity_id,
                FriendshipORM.identity_id_b == identity_id,
            ),
        )
        result = await self._db.execute(query)
        requests = []

        for orm in result.scalars():
            requester_id = orm.requested_by
            profile = await self._get_user_profile_data(requester_id)
            requests.append(FriendRequest(
                id=orm.id,
                user_id=requester_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
                level=profile.get("level"),
                created_at=orm.created_at or datetime.now(UTC),
            ))

        return requests

    async def get_outgoing_friend_requests(
        self,
        identity_id: str,
    ) -> list[FriendRequest]:
        """Get pending friend requests sent by the user."""
        query = select(FriendshipORM).where(
            FriendshipORM.status == FriendshipStatus.PENDING,
            FriendshipORM.requested_by == identity_id,
        )
        result = await self._db.execute(query)
        requests = []

        for orm in result.scalars():
            # Get the other user's ID
            target_id = orm.identity_id_b if orm.identity_id_a == identity_id else orm.identity_id_a
            profile = await self._get_user_profile_data(target_id)
            requests.append(FriendRequest(
                id=orm.id,
                user_id=target_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
                level=profile.get("level"),
                created_at=orm.created_at or datetime.now(UTC),
            ))

        return requests

    async def respond_to_friend_request(
        self,
        identity_id: str,
        request_id: str,
        accept: bool,
    ) -> Friendship | None:
        """Accept or decline a friend request."""
        result = await self._db.execute(
            select(FriendshipORM).where(FriendshipORM.id == request_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            raise ValueError("Friend request not found")

        # Verify this user is the recipient (not the requester)
        if orm.requested_by == identity_id:
            raise ValueError("Cannot respond to your own friend request")

        # Verify this user is part of the friendship
        if identity_id not in (orm.identity_id_a, orm.identity_id_b):
            raise ValueError("Friend request not found")

        if orm.status != FriendshipStatus.PENDING:
            raise ValueError("Friend request is no longer pending")

        if accept:
            return await self._accept_friendship(orm, identity_id)
        else:
            # Decline - delete the record
            await self._db.delete(orm)
            await self._db.flush()

            await self._record_social_event(
                identity_id=identity_id,
                event_type="friend_request_declined",
                related_id=orm.requested_by,
            )
            return None

    async def get_friends(
        self,
        identity_id: str,
        status: FriendshipStatus | None = None,
    ) -> list[Friendship]:
        """Get user's friends."""
        query = select(FriendshipORM).where(
            or_(
                FriendshipORM.identity_id_a == identity_id,
                FriendshipORM.identity_id_b == identity_id,
            ),
        )

        if status:
            query = query.where(FriendshipORM.status == status)
        else:
            # Default to accepted friends only
            query = query.where(FriendshipORM.status == FriendshipStatus.ACCEPTED)

        result = await self._db.execute(query)
        friends = []

        for orm in result.scalars():
            friends.append(await self._friendship_to_model(orm, identity_id))

        return friends

    async def remove_friend(
        self,
        identity_id: str,
        friend_id: str,
    ) -> bool:
        """Remove a friend."""
        orm = await self._get_friendship_record(identity_id, friend_id)
        if not orm or orm.status != FriendshipStatus.ACCEPTED:
            raise ValueError("Friendship not found")

        await self._db.delete(orm)
        await self._db.flush()

        # Update friend counts
        await self._update_friend_counts(identity_id, -1)
        await self._update_friend_counts(friend_id, -1)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="friend_removed",
            related_id=friend_id,
        )

        return True

    async def block_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> bool:
        """Block a user."""
        # Check existing relationship
        orm = await self._get_friendship_record(identity_id, target_id)

        if orm:
            # Update existing to blocked
            if orm.status == FriendshipStatus.ACCEPTED:
                await self._update_friend_counts(identity_id, -1)
                await self._update_friend_counts(target_id, -1)
            orm.status = FriendshipStatus.BLOCKED
            orm.requested_by = identity_id  # Blocker is stored as requester
        else:
            # Create new blocked relationship
            id_a, id_b = (identity_id, target_id) if identity_id < target_id else (target_id, identity_id)
            orm = FriendshipORM(
                id=str(uuid4()),
                identity_id_a=id_a,
                identity_id_b=id_b,
                status=FriendshipStatus.BLOCKED,
                requested_by=identity_id,
            )
            self._db.add(orm)

        await self._db.flush()

        # Also remove any follows
        await self._remove_follows_between(identity_id, target_id)

        return True

    async def unblock_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> bool:
        """Unblock a user."""
        orm = await self._get_friendship_record(identity_id, target_id)

        if not orm or orm.status != FriendshipStatus.BLOCKED:
            raise ValueError("User is not blocked")

        # Only the blocker can unblock
        if orm.requested_by != identity_id:
            raise ValueError("You cannot unblock this user")

        await self._db.delete(orm)
        await self._db.flush()

        return True

    # =========================================================================
    # Follows
    # =========================================================================

    async def follow_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> Follow:
        """Follow a user."""
        if identity_id == target_id:
            raise ValueError("Cannot follow yourself")

        # Check if blocked
        friendship = await self._get_friendship_record(identity_id, target_id)
        if friendship and friendship.status == FriendshipStatus.BLOCKED:
            raise ValueError("Cannot follow this user")

        # Check if already following
        existing = await self._get_follow_record(identity_id, target_id)
        if existing:
            raise ValueError("Already following this user")

        # Check if target's profile is public (or they're friends)
        is_friend = friendship and friendship.status == FriendshipStatus.ACCEPTED
        is_public = await self._is_profile_public(target_id)

        if not is_public and not is_friend:
            raise ValueError("Cannot follow private profiles")

        follow_orm = FollowORM(
            id=str(uuid4()),
            follower_id=identity_id,
            following_id=target_id,
            created_at=datetime.now(UTC),
        )
        self._db.add(follow_orm)
        await self._db.flush()

        # Update counts
        await self._update_following_count(identity_id, 1)
        await self._update_followers_count(target_id, 1)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="follow_started",
            related_id=target_id,
        )

        profile = await self._get_user_profile_data(target_id)
        return Follow(
            id=follow_orm.id,
            user_id=target_id,
            username=profile.get("username"),
            display_name=profile.get("display_name"),
            avatar_url=profile.get("avatar_url"),
            level=profile.get("level"),
            created_at=follow_orm.created_at,
        )

    async def unfollow_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> bool:
        """Unfollow a user."""
        orm = await self._get_follow_record(identity_id, target_id)
        if not orm:
            raise ValueError("Not following this user")

        await self._db.delete(orm)
        await self._db.flush()

        await self._update_following_count(identity_id, -1)
        await self._update_followers_count(target_id, -1)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="follow_ended",
            related_id=target_id,
        )

        return True

    async def get_followers(
        self,
        identity_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Follow]:
        """Get users who follow this user."""
        query = (
            select(FollowORM)
            .where(FollowORM.following_id == identity_id)
            .order_by(desc(FollowORM.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self._db.execute(query)
        followers = []

        for orm in result.scalars():
            profile = await self._get_user_profile_data(orm.follower_id)
            followers.append(Follow(
                id=orm.id,
                user_id=orm.follower_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
                level=profile.get("level"),
                created_at=orm.created_at,
            ))

        return followers

    async def get_following(
        self,
        identity_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Follow]:
        """Get users this user follows."""
        query = (
            select(FollowORM)
            .where(FollowORM.follower_id == identity_id)
            .order_by(desc(FollowORM.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self._db.execute(query)
        following = []

        for orm in result.scalars():
            profile = await self._get_user_profile_data(orm.following_id)
            following.append(Follow(
                id=orm.id,
                user_id=orm.following_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
                level=profile.get("level"),
                created_at=orm.created_at,
            ))

        return following

    # =========================================================================
    # Public Profiles
    # =========================================================================

    async def get_public_profile(
        self,
        viewer_id: str,
        target_id: str,
    ) -> PublicUserProfile:
        """Get a user's public profile with privacy filtering."""
        profile = await self._get_user_profile_data(target_id)
        social = await self._get_social_profile_data(target_id)

        # Get relationship status
        friendship = await self._get_friendship_record(viewer_id, target_id)
        is_friend = friendship is not None and friendship.status == FriendshipStatus.ACCEPTED
        is_following = await self._is_following(viewer_id, target_id)
        is_followed_by = await self._is_following(target_id, viewer_id)

        result = PublicUserProfile(
            identity_id=target_id,
            username=social.get("username"),
            display_name=profile.get("display_name"),
            avatar_url=profile.get("avatar_url"),
            bio=social.get("bio"),
            is_friend=is_friend,
            is_following=is_following,
            is_followed_by=is_followed_by,
            friendship_status=friendship.status if friendship else None,
        )

        # Apply privacy settings
        is_public = social.get("profile_public", False)

        if is_public or is_friend or viewer_id == target_id:
            if social.get("show_level", True):
                result.level = profile.get("level")
                result.title = profile.get("title")

            if social.get("show_streaks", True):
                streaks = await self._get_user_streaks(target_id)
                result.streaks = streaks

            if social.get("show_achievements", True):
                result.achievement_count = await self._count_user_achievements(target_id)

        return result

    async def search_users(
        self,
        identity_id: str,
        query: str,
        limit: int = 20,
    ) -> list[PublicUserProfile]:
        """Search for users by username or display name."""
        if not query or len(query) < 2:
            return []

        # Search in social_profiles and user_profiles
        # This is a simplified implementation - in production you'd want full-text search
        from src.modules.profile.orm import SocialProfileORM, UserProfileORM

        search_pattern = f"%{query.lower()}%"

        # Search usernames
        social_query = select(SocialProfileORM).where(
            func.lower(SocialProfileORM.username).like(search_pattern),
            SocialProfileORM.profile_public == True,  # noqa: E712
        ).limit(limit)

        result = await self._db.execute(social_query)
        profiles = []

        for orm in result.scalars():
            if orm.identity_id != identity_id:  # Exclude self
                profile = await self.get_public_profile(identity_id, orm.identity_id)
                profiles.append(profile)

        return profiles

    # =========================================================================
    # Leaderboards
    # =========================================================================

    async def get_leaderboard(
        self,
        identity_id: str,
        leaderboard_type: LeaderboardType,
        period: LeaderboardPeriod = LeaderboardPeriod.WEEK,
        limit: int = 100,
    ) -> Leaderboard:
        """Get a leaderboard."""
        from src.modules.progression.orm import UserLevelORM, StreakORM
        from src.modules.profile.orm import SocialProfileORM

        entries = []
        my_rank = None
        my_value = None

        if leaderboard_type in (LeaderboardType.GLOBAL_XP, LeaderboardType.FRIENDS_XP):
            # XP leaderboard
            query = select(UserLevelORM).order_by(desc(UserLevelORM.total_xp_earned))

            if leaderboard_type == LeaderboardType.FRIENDS_XP:
                # Only friends
                friend_ids = await self._get_friend_ids(identity_id)
                friend_ids.append(identity_id)  # Include self
                query = query.where(UserLevelORM.identity_id.in_(friend_ids))
            else:
                # Global - only public profiles
                public_ids = await self._get_public_profile_ids()
                public_ids.append(identity_id)  # Always include self
                query = query.where(UserLevelORM.identity_id.in_(public_ids))

            query = query.limit(limit)
            result = await self._db.execute(query)

            rank = 0
            for orm in result.scalars():
                rank += 1
                profile = await self._get_user_profile_data(orm.identity_id)
                is_current = orm.identity_id == identity_id

                entries.append(LeaderboardEntry(
                    rank=rank,
                    identity_id=orm.identity_id,
                    username=profile.get("username"),
                    display_name=profile.get("display_name"),
                    avatar_url=profile.get("avatar_url"),
                    value=float(orm.total_xp_earned),
                    is_current_user=is_current,
                ))

                if is_current:
                    my_rank = rank
                    my_value = float(orm.total_xp_earned)

        elif leaderboard_type in (LeaderboardType.GLOBAL_STREAKS, LeaderboardType.FRIENDS_STREAKS):
            # Streak leaderboard (fasting streaks)
            from src.modules.progression.models import StreakType

            query = (
                select(StreakORM)
                .where(StreakORM.streak_type == StreakType.FASTING)
                .order_by(desc(StreakORM.current_count))
            )

            if leaderboard_type == LeaderboardType.FRIENDS_STREAKS:
                friend_ids = await self._get_friend_ids(identity_id)
                friend_ids.append(identity_id)
                query = query.where(StreakORM.identity_id.in_(friend_ids))
            else:
                public_ids = await self._get_public_profile_ids()
                public_ids.append(identity_id)
                query = query.where(StreakORM.identity_id.in_(public_ids))

            query = query.limit(limit)
            result = await self._db.execute(query)

            rank = 0
            for orm in result.scalars():
                rank += 1
                profile = await self._get_user_profile_data(orm.identity_id)
                is_current = orm.identity_id == identity_id

                entries.append(LeaderboardEntry(
                    rank=rank,
                    identity_id=orm.identity_id,
                    username=profile.get("username"),
                    display_name=profile.get("display_name"),
                    avatar_url=profile.get("avatar_url"),
                    value=float(orm.current_count),
                    is_current_user=is_current,
                ))

                if is_current:
                    my_rank = rank
                    my_value = float(orm.current_count)

        return Leaderboard(
            type=leaderboard_type,
            period=period,
            entries=entries,
            my_rank=my_rank,
            my_value=my_value,
            total_participants=len(entries),
            updated_at=datetime.now(UTC),
        )

    # =========================================================================
    # Challenges
    # =========================================================================

    async def create_challenge(
        self,
        identity_id: str,
        name: str,
        challenge_type: ChallengeType,
        goal_value: float,
        start_date: date,
        end_date: date,
        description: str | None = None,
        goal_unit: str | None = None,
        is_public: bool = False,
        max_participants: int = 50,
    ) -> Challenge:
        """Create a new challenge."""
        if end_date <= start_date:
            raise ValueError("End date must be after start date")

        if end_date < date.today():
            raise ValueError("Challenge cannot end in the past")

        join_code = secrets.token_hex(4).upper()

        challenge_orm = ChallengeORM(
            id=str(uuid4()),
            name=name,
            description=description,
            challenge_type=challenge_type,
            goal_value=goal_value,
            goal_unit=goal_unit,
            start_date=start_date,
            end_date=end_date,
            created_by=identity_id,
            join_code=join_code,
            is_public=is_public,
            max_participants=max_participants,
        )
        self._db.add(challenge_orm)
        await self._db.flush()

        # Creator automatically joins
        await self.join_challenge(identity_id, challenge_orm.id)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="challenge_created",
            related_id=challenge_orm.id,
            metadata={"name": name, "type": challenge_type.value},
        )

        return await self._challenge_to_model(challenge_orm, identity_id)

    async def get_challenge(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> Challenge | None:
        """Get a challenge by ID."""
        result = await self._db.execute(
            select(ChallengeORM).where(ChallengeORM.id == challenge_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            return None

        return await self._challenge_to_model(orm, identity_id)

    async def list_challenges(
        self,
        identity_id: str,
        include_public: bool = True,
        active_only: bool = True,
    ) -> list[Challenge]:
        """List available challenges."""
        today = date.today()

        # Get challenges user is participating in
        participating_query = select(ChallengeParticipantORM.challenge_id).where(
            ChallengeParticipantORM.identity_id == identity_id
        )
        participating_result = await self._db.execute(participating_query)
        participating_ids = [row[0] for row in participating_result.fetchall()]

        # Build main query
        conditions = []

        if include_public:
            conditions.append(ChallengeORM.is_public == True)  # noqa: E712

        conditions.append(ChallengeORM.id.in_(participating_ids))
        conditions.append(ChallengeORM.created_by == identity_id)

        # Get challenges from friends
        friend_ids = await self._get_friend_ids(identity_id)
        if friend_ids:
            conditions.append(ChallengeORM.created_by.in_(friend_ids))

        query = select(ChallengeORM).where(or_(*conditions))

        if active_only:
            query = query.where(
                ChallengeORM.start_date <= today,
                ChallengeORM.end_date >= today,
            )

        query = query.order_by(desc(ChallengeORM.created_at)).limit(50)

        result = await self._db.execute(query)
        challenges = []

        for orm in result.scalars():
            challenges.append(await self._challenge_to_model(orm, identity_id))

        return challenges

    async def join_challenge(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> ChallengeParticipant:
        """Join a challenge."""
        result = await self._db.execute(
            select(ChallengeORM).where(ChallengeORM.id == challenge_id)
        )
        challenge = result.scalar_one_or_none()

        if not challenge:
            raise ValueError("Challenge not found")

        # Check if already participating
        existing = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == challenge_id,
                ChallengeParticipantORM.identity_id == identity_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already participating in this challenge")

        # Check participant limit
        count_result = await self._db.execute(
            select(func.count(ChallengeParticipantORM.id)).where(
                ChallengeParticipantORM.challenge_id == challenge_id
            )
        )
        current_count = count_result.scalar() or 0

        if current_count >= challenge.max_participants:
            raise ValueError("Challenge is full")

        participant_orm = ChallengeParticipantORM(
            id=str(uuid4()),
            challenge_id=challenge_id,
            identity_id=identity_id,
            joined_at=datetime.now(UTC),
            current_progress=0,
            completed=False,
            rank=current_count + 1,
        )
        self._db.add(participant_orm)
        await self._db.flush()

        await self._record_social_event(
            identity_id=identity_id,
            event_type="challenge_joined",
            related_id=challenge_id,
            metadata={"name": challenge.name},
        )

        profile = await self._get_user_profile_data(identity_id)
        return ChallengeParticipant(
            id=participant_orm.id,
            identity_id=identity_id,
            username=profile.get("username"),
            display_name=profile.get("display_name"),
            avatar_url=profile.get("avatar_url"),
            current_progress=0,
            completed=False,
            rank=participant_orm.rank,
            joined_at=participant_orm.joined_at,
        )

    async def join_challenge_by_code(
        self,
        identity_id: str,
        join_code: str,
    ) -> ChallengeParticipant:
        """Join a challenge using its join code."""
        result = await self._db.execute(
            select(ChallengeORM).where(
                func.upper(ChallengeORM.join_code) == join_code.upper()
            )
        )
        challenge = result.scalar_one_or_none()

        if not challenge:
            raise ValueError("Invalid join code")

        return await self.join_challenge(identity_id, challenge.id)

    async def leave_challenge(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> bool:
        """Leave a challenge."""
        result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == challenge_id,
                ChallengeParticipantORM.identity_id == identity_id,
            )
        )
        participant = result.scalar_one_or_none()

        if not participant:
            raise ValueError("Not participating in this challenge")

        # Check if user is the creator
        challenge_result = await self._db.execute(
            select(ChallengeORM).where(ChallengeORM.id == challenge_id)
        )
        challenge = challenge_result.scalar_one_or_none()

        if challenge and challenge.created_by == identity_id:
            raise ValueError("Creator cannot leave their own challenge")

        await self._db.delete(participant)
        await self._db.flush()

        return True

    async def get_challenge_leaderboard(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> list[ChallengeParticipant]:
        """Get the leaderboard for a challenge."""
        query = (
            select(ChallengeParticipantORM)
            .where(ChallengeParticipantORM.challenge_id == challenge_id)
            .order_by(desc(ChallengeParticipantORM.current_progress))
        )
        result = await self._db.execute(query)
        participants = []

        rank = 0
        for orm in result.scalars():
            rank += 1
            profile = await self._get_user_profile_data(orm.identity_id)
            participants.append(ChallengeParticipant(
                id=orm.id,
                identity_id=orm.identity_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
                current_progress=orm.current_progress,
                completed=orm.completed,
                completed_at=orm.completed_at,
                rank=rank,
                joined_at=orm.joined_at,
            ))

        return participants

    async def get_my_challenges(
        self,
        identity_id: str,
        active_only: bool = True,
    ) -> list[Challenge]:
        """Get challenges the user is participating in."""
        today = date.today()

        query = (
            select(ChallengeORM)
            .join(ChallengeParticipantORM, ChallengeORM.id == ChallengeParticipantORM.challenge_id)
            .where(ChallengeParticipantORM.identity_id == identity_id)
        )

        if active_only:
            query = query.where(
                ChallengeORM.start_date <= today,
                ChallengeORM.end_date >= today,
            )

        query = query.order_by(desc(ChallengeORM.start_date))
        result = await self._db.execute(query)
        challenges = []

        for orm in result.scalars():
            challenges.append(await self._challenge_to_model(orm, identity_id))

        return challenges

    async def update_challenge_progress(
        self,
        identity_id: str,
    ) -> None:
        """Update user's progress in all active challenges."""
        today = date.today()

        # Get active challenges user is in
        query = (
            select(ChallengeParticipantORM)
            .join(ChallengeORM, ChallengeORM.id == ChallengeParticipantORM.challenge_id)
            .where(
                ChallengeParticipantORM.identity_id == identity_id,
                ChallengeORM.start_date <= today,
                ChallengeORM.end_date >= today,
            )
        )
        result = await self._db.execute(query)

        for participant in result.scalars():
            # Get challenge details
            challenge_result = await self._db.execute(
                select(ChallengeORM).where(ChallengeORM.id == participant.challenge_id)
            )
            challenge = challenge_result.scalar_one_or_none()

            if not challenge:
                continue

            # Calculate progress based on challenge type
            progress = await self._calculate_challenge_progress(
                identity_id,
                challenge.challenge_type,
                challenge.start_date,
            )

            participant.current_progress = progress

            # Check if completed
            if progress >= challenge.goal_value and not participant.completed:
                participant.completed = True
                participant.completed_at = datetime.now(UTC)

                await self._record_social_event(
                    identity_id=identity_id,
                    event_type="challenge_completed",
                    related_id=challenge.id,
                    metadata={"name": challenge.name, "progress": progress},
                )

        await self._db.flush()

        # Update ranks for all challenges user is in
        await self._update_challenge_ranks(identity_id)

    # =========================================================================
    # Sharing
    # =========================================================================

    async def generate_share_content(
        self,
        identity_id: str,
        share_type: str,
        related_id: str | None = None,
        custom_message: str | None = None,
    ) -> ShareContent:
        """Generate shareable content for an achievement, streak, etc."""
        profile = await self._get_user_profile_data(identity_id)
        username = profile.get("username") or "User"

        if share_type == "achievement" and related_id:
            # Get achievement details
            from src.modules.progression.orm import AchievementORM
            result = await self._db.execute(
                select(AchievementORM).where(AchievementORM.id == related_id)
            )
            achievement = result.scalar_one_or_none()

            if achievement:
                title = f"Achievement Unlocked!"
                message = custom_message or f"I just unlocked '{achievement.name}' on UGOKI! {achievement.description}"
            else:
                title = "Achievement Unlocked!"
                message = custom_message or "I just unlocked an achievement on UGOKI!"

        elif share_type == "streak":
            from src.modules.progression.orm import StreakORM
            from src.modules.progression.models import StreakType

            result = await self._db.execute(
                select(StreakORM).where(
                    StreakORM.identity_id == identity_id,
                    StreakORM.streak_type == StreakType.FASTING,
                )
            )
            streak = result.scalar_one_or_none()

            if streak:
                title = f"{streak.current_count}-Day Streak!"
                message = custom_message or f"I'm on a {streak.current_count}-day fasting streak on UGOKI!"
            else:
                title = "Streak Milestone!"
                message = custom_message or "I just hit a streak milestone on UGOKI!"

        elif share_type == "level_up":
            level = profile.get("level", 1)
            title_str = profile.get("title", "Beginner")
            title = f"Level Up!"
            message = custom_message or f"I just reached Level {level} ({title_str}) on UGOKI!"

        elif share_type == "workout":
            title = "Workout Complete!"
            message = custom_message or "Just crushed a workout on UGOKI!"

        elif share_type == "challenge_win" and related_id:
            result = await self._db.execute(
                select(ChallengeORM).where(ChallengeORM.id == related_id)
            )
            challenge = result.scalar_one_or_none()

            if challenge:
                title = "Challenge Won!"
                message = custom_message or f"I won the '{challenge.name}' challenge on UGOKI!"
            else:
                title = "Challenge Won!"
                message = custom_message or "I just won a challenge on UGOKI!"

        else:
            title = "UGOKI Progress"
            message = custom_message or "Making progress on my health journey with UGOKI!"

        await self._record_social_event(
            identity_id=identity_id,
            event_type="share_created",
            metadata={"share_type": share_type},
        )

        return ShareContent(
            title=title,
            message=message,
            image_url=None,  # Image generation would be implemented separately
            deep_link=f"ugoki://share/{share_type}",
        )

    # =========================================================================
    # Private Helpers
    # =========================================================================

    async def _find_user_id(
        self,
        friend_code: str | None,
        username: str | None,
    ) -> str | None:
        """Find a user ID by friend code or username."""
        from src.modules.profile.orm import SocialProfileORM

        if friend_code:
            result = await self._db.execute(
                select(SocialProfileORM).where(
                    func.upper(SocialProfileORM.friend_code) == friend_code.upper()
                )
            )
            orm = result.scalar_one_or_none()
            return orm.identity_id if orm else None

        if username:
            result = await self._db.execute(
                select(SocialProfileORM).where(
                    func.lower(SocialProfileORM.username) == username.lower()
                )
            )
            orm = result.scalar_one_or_none()
            return orm.identity_id if orm else None

        return None

    async def _get_friendship_record(
        self,
        identity_id: str,
        other_id: str,
    ) -> FriendshipORM | None:
        """Get friendship record between two users."""
        id_a, id_b = (identity_id, other_id) if identity_id < other_id else (other_id, identity_id)

        result = await self._db.execute(
            select(FriendshipORM).where(
                FriendshipORM.identity_id_a == id_a,
                FriendshipORM.identity_id_b == id_b,
            )
        )
        return result.scalar_one_or_none()

    async def _get_follow_record(
        self,
        follower_id: str,
        following_id: str,
    ) -> FollowORM | None:
        """Get follow record."""
        result = await self._db.execute(
            select(FollowORM).where(
                FollowORM.follower_id == follower_id,
                FollowORM.following_id == following_id,
            )
        )
        return result.scalar_one_or_none()

    async def _accept_friendship(
        self,
        orm: FriendshipORM,
        accepting_user_id: str,
    ) -> Friendship:
        """Accept a friendship."""
        orm.status = FriendshipStatus.ACCEPTED
        orm.accepted_at = datetime.now(UTC)
        await self._db.flush()

        # Update friend counts for both users
        other_id = orm.identity_id_b if orm.identity_id_a == accepting_user_id else orm.identity_id_a
        await self._update_friend_counts(accepting_user_id, 1)
        await self._update_friend_counts(other_id, 1)

        await self._record_social_event(
            identity_id=accepting_user_id,
            event_type="friend_request_accepted",
            related_id=other_id,
        )

        return await self._friendship_to_model(orm, accepting_user_id)

    async def _friendship_to_model(
        self,
        orm: FriendshipORM,
        viewer_id: str,
    ) -> Friendship:
        """Convert friendship ORM to model from viewer's perspective."""
        friend_id = orm.identity_id_b if orm.identity_id_a == viewer_id else orm.identity_id_a
        profile = await self._get_user_profile_data(friend_id)

        return Friendship(
            id=orm.id,
            friend_id=friend_id,
            friend_username=profile.get("username"),
            friend_display_name=profile.get("display_name"),
            friend_avatar_url=profile.get("avatar_url"),
            friend_level=profile.get("level"),
            status=orm.status,
            requested_by_me=(orm.requested_by == viewer_id),
            created_at=orm.created_at or datetime.now(UTC),
            accepted_at=orm.accepted_at,
        )

    async def _challenge_to_model(
        self,
        orm: ChallengeORM,
        viewer_id: str,
    ) -> Challenge:
        """Convert challenge ORM to model."""
        today = date.today()

        # Determine status
        if orm.start_date > today:
            status = ChallengeStatus.UPCOMING
        elif orm.end_date < today:
            status = ChallengeStatus.COMPLETED
        else:
            status = ChallengeStatus.ACTIVE

        # Get participant count
        count_result = await self._db.execute(
            select(func.count(ChallengeParticipantORM.id)).where(
                ChallengeParticipantORM.challenge_id == orm.id
            )
        )
        participant_count = count_result.scalar() or 0

        # Get viewer's progress if participating
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == orm.id,
                ChallengeParticipantORM.identity_id == viewer_id,
            )
        )
        participant = participant_result.scalar_one_or_none()

        creator_profile = await self._get_user_profile_data(orm.created_by)

        days_remaining = None
        if status == ChallengeStatus.ACTIVE:
            days_remaining = (orm.end_date - today).days

        return Challenge(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            challenge_type=orm.challenge_type,
            goal_value=orm.goal_value,
            goal_unit=orm.goal_unit,
            start_date=orm.start_date,
            end_date=orm.end_date,
            created_by=orm.created_by,
            creator_username=creator_profile.get("username"),
            join_code=orm.join_code,
            is_public=orm.is_public,
            max_participants=orm.max_participants,
            participant_count=participant_count,
            status=status,
            my_progress=participant.current_progress if participant else None,
            my_rank=participant.rank if participant else None,
            is_participating=participant is not None,
            days_remaining=days_remaining,
            created_at=orm.created_at or datetime.now(UTC),
        )

    async def _get_user_profile_data(self, identity_id: str) -> dict:
        """Get basic profile data for a user."""
        from src.modules.profile.orm import UserProfileORM, SocialProfileORM
        from src.modules.progression.orm import UserLevelORM

        profile_result = await self._db.execute(
            select(UserProfileORM).where(UserProfileORM.identity_id == identity_id)
        )
        profile = profile_result.scalar_one_or_none()

        social_result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        social = social_result.scalar_one_or_none()

        level_result = await self._db.execute(
            select(UserLevelORM).where(UserLevelORM.identity_id == identity_id)
        )
        level_orm = level_result.scalar_one_or_none()

        # Get title from level
        level = level_orm.current_level if level_orm else 1
        title = self._get_title_for_level(level)

        return {
            "display_name": profile.display_name if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "username": social.username if social else None,
            "level": level,
            "title": title,
        }

    async def _get_social_profile_data(self, identity_id: str) -> dict:
        """Get social profile settings."""
        from src.modules.profile.orm import SocialProfileORM

        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            return {
                "username": None,
                "bio": None,
                "profile_public": False,
                "show_streaks": True,
                "show_achievements": True,
                "show_level": True,
            }

        return {
            "username": orm.username,
            "bio": orm.bio,
            "profile_public": orm.profile_public,
            "show_streaks": orm.show_streaks,
            "show_achievements": orm.show_achievements,
            "show_level": orm.show_level,
        }

    async def _is_profile_public(self, identity_id: str) -> bool:
        """Check if a user's profile is public."""
        social = await self._get_social_profile_data(identity_id)
        return social.get("profile_public", False)

    async def _is_following(self, follower_id: str, following_id: str) -> bool:
        """Check if user A follows user B."""
        result = await self._get_follow_record(follower_id, following_id)
        return result is not None

    async def _get_friend_ids(self, identity_id: str) -> list[str]:
        """Get list of friend IDs."""
        result = await self._db.execute(
            select(FriendshipORM).where(
                FriendshipORM.status == FriendshipStatus.ACCEPTED,
                or_(
                    FriendshipORM.identity_id_a == identity_id,
                    FriendshipORM.identity_id_b == identity_id,
                ),
            )
        )

        friend_ids = []
        for orm in result.scalars():
            friend_id = orm.identity_id_b if orm.identity_id_a == identity_id else orm.identity_id_a
            friend_ids.append(friend_id)

        return friend_ids

    async def _get_public_profile_ids(self) -> list[str]:
        """Get list of users with public profiles."""
        from src.modules.profile.orm import SocialProfileORM

        result = await self._db.execute(
            select(SocialProfileORM.identity_id).where(
                SocialProfileORM.profile_public == True  # noqa: E712
            )
        )
        return [row[0] for row in result.fetchall()]

    async def _get_user_streaks(self, identity_id: str) -> dict[str, int]:
        """Get user's current streaks."""
        from src.modules.progression.orm import StreakORM

        result = await self._db.execute(
            select(StreakORM).where(StreakORM.identity_id == identity_id)
        )

        streaks = {}
        for orm in result.scalars():
            streaks[orm.streak_type.value] = orm.current_count

        return streaks

    async def _count_user_achievements(self, identity_id: str) -> int:
        """Count user's unlocked achievements."""
        from src.modules.progression.orm import UserAchievementORM

        result = await self._db.execute(
            select(func.count(UserAchievementORM.id)).where(
                UserAchievementORM.identity_id == identity_id,
                UserAchievementORM.is_unlocked == True,  # noqa: E712
            )
        )
        return result.scalar() or 0

    async def _update_friend_counts(self, identity_id: str, delta: int) -> None:
        """Update friend count for a user."""
        from src.modules.profile.orm import SocialProfileORM

        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if orm:
            orm.friends_count = max(0, orm.friends_count + delta)
            await self._db.flush()

    async def _update_followers_count(self, identity_id: str, delta: int) -> None:
        """Update followers count for a user."""
        from src.modules.profile.orm import SocialProfileORM

        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if orm:
            orm.followers_count = max(0, orm.followers_count + delta)
            await self._db.flush()

    async def _update_following_count(self, identity_id: str, delta: int) -> None:
        """Update following count for a user."""
        from src.modules.profile.orm import SocialProfileORM

        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if orm:
            orm.following_count = max(0, orm.following_count + delta)
            await self._db.flush()

    async def _remove_follows_between(self, user_a: str, user_b: str) -> None:
        """Remove all follows between two users."""
        await self._db.execute(
            select(FollowORM).where(
                or_(
                    and_(FollowORM.follower_id == user_a, FollowORM.following_id == user_b),
                    and_(FollowORM.follower_id == user_b, FollowORM.following_id == user_a),
                )
            )
        )
        # Delete found records
        result = await self._db.execute(
            select(FollowORM).where(
                or_(
                    and_(FollowORM.follower_id == user_a, FollowORM.following_id == user_b),
                    and_(FollowORM.follower_id == user_b, FollowORM.following_id == user_a),
                )
            )
        )
        for orm in result.scalars():
            await self._db.delete(orm)
        await self._db.flush()

    async def _calculate_challenge_progress(
        self,
        identity_id: str,
        challenge_type: ChallengeType,
        start_date: date,
    ) -> float:
        """Calculate user's progress for a challenge type."""
        from src.modules.progression.orm import StreakORM, UserLevelORM, XPTransactionORM
        from src.modules.progression.models import StreakType
        from src.modules.time_keeper.orm import TimeWindowORM
        from src.modules.time_keeper.models import WindowType, WindowState

        if challenge_type == ChallengeType.FASTING_STREAK:
            result = await self._db.execute(
                select(StreakORM).where(
                    StreakORM.identity_id == identity_id,
                    StreakORM.streak_type == StreakType.FASTING,
                )
            )
            streak = result.scalar_one_or_none()
            return float(streak.current_count) if streak else 0

        elif challenge_type == ChallengeType.WORKOUT_COUNT:
            # Count completed workouts since challenge start
            result = await self._db.execute(
                select(func.count(TimeWindowORM.id)).where(
                    TimeWindowORM.identity_id == identity_id,
                    TimeWindowORM.window_type == WindowType.WORKOUT,
                    TimeWindowORM.state == WindowState.COMPLETED,
                    func.date(TimeWindowORM.end_time) >= start_date,
                )
            )
            return float(result.scalar() or 0)

        elif challenge_type == ChallengeType.TOTAL_XP:
            # XP earned since challenge start
            result = await self._db.execute(
                select(func.sum(XPTransactionORM.amount)).where(
                    XPTransactionORM.identity_id == identity_id,
                    func.date(XPTransactionORM.created_at) >= start_date,
                )
            )
            return float(result.scalar() or 0)

        elif challenge_type == ChallengeType.CONSISTENCY:
            # Days logged in since challenge start
            # This would require tracking daily logins - simplified for now
            from src.modules.event_journal.orm import ActivityEventORM

            result = await self._db.execute(
                select(func.count(func.distinct(func.date(ActivityEventORM.timestamp)))).where(
                    ActivityEventORM.identity_id == identity_id,
                    func.date(ActivityEventORM.timestamp) >= start_date,
                )
            )
            return float(result.scalar() or 0)

        return 0

    async def _update_challenge_ranks(self, identity_id: str) -> None:
        """Update ranks for all challenges a user is in."""
        today = date.today()

        # Get active challenge IDs
        query = (
            select(ChallengeParticipantORM.challenge_id)
            .join(ChallengeORM, ChallengeORM.id == ChallengeParticipantORM.challenge_id)
            .where(
                ChallengeParticipantORM.identity_id == identity_id,
                ChallengeORM.start_date <= today,
                ChallengeORM.end_date >= today,
            )
        )
        result = await self._db.execute(query)
        challenge_ids = [row[0] for row in result.fetchall()]

        for challenge_id in challenge_ids:
            # Get all participants ordered by progress
            participants_query = (
                select(ChallengeParticipantORM)
                .where(ChallengeParticipantORM.challenge_id == challenge_id)
                .order_by(desc(ChallengeParticipantORM.current_progress))
            )
            participants_result = await self._db.execute(participants_query)

            rank = 0
            for participant in participants_result.scalars():
                rank += 1
                participant.rank = rank

        await self._db.flush()

    def _get_title_for_level(self, level: int) -> str:
        """Get title for a level."""
        titles = {
            1: "Beginner",
            5: "Apprentice",
            10: "Practitioner",
            15: "Dedicated",
            20: "Committed",
            25: "Warrior",
            30: "Champion",
            40: "Master",
            50: "Grandmaster",
            75: "Legend",
            100: "Transcendent",
        }
        title = "Beginner"
        for lvl, t in sorted(titles.items()):
            if level >= lvl:
                title = t
        return title

    async def _record_social_event(
        self,
        identity_id: str,
        event_type: str,
        related_id: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Record a social event in the event journal."""
        if not self._event_journal:
            return

        # Import here to avoid circular imports
        try:
            from src.modules.event_journal.models import EventSource

            await self._event_journal.record_event(
                identity_id=identity_id,
                event_type=event_type,
                related_id=related_id,
                related_type="social",
                source=EventSource.API,
                metadata=metadata or {},
            )
        except Exception:
            # Don't fail the main operation if event logging fails
            pass
