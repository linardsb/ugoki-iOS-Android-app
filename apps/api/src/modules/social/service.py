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
    DuoStreakType,
    DuoStreakInviteStatus,
    FeedActivityType,
    Friendship,
    FriendRequest,
    Follow,
    Challenge,
    ChallengeParticipant,
    LeaderboardEntry,
    Leaderboard,
    PublicUserProfile,
    ShareContent,
    DuoStreak,
    DuoStreakInvite,
    DuoStreakMilestone,
    FeedItem,
    FeedPreferences,
    ChallengeTemplate,
    AchievementCelebration,
    CelebrateAchievementResponse,
    AchievementCelebrationList,
    ChallengeTeam,
    ChallengeTeamLeaderboard,
    JoinTeamResponse,
)
from src.modules.social.orm import (
    FriendshipORM,
    FollowORM,
    ChallengeORM,
    ChallengeParticipantORM,
    ChallengeTeamORM,
    DuoStreakORM,
    DuoStreakDailyORM,
    DuoStreakInviteORM,
    DuoStreakMilestoneORM,
    FeedItemORM,
    FeedCheerORM,
    FeedPreferencesORM,
    ChallengeTemplateORM,
    AchievementCelebrationORM,
    TeamMessageORM,
    TeamMessageReactionORM,
    TeamMessageReadORM,
    TeamMessageMentionORM,
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

    def _get_period_start(self, period: LeaderboardPeriod) -> datetime | None:
        """Calculate the start datetime for a leaderboard period."""
        now = datetime.now(UTC)
        if period == LeaderboardPeriod.WEEK:
            # Start of the current week (Monday 00:00 UTC)
            days_since_monday = now.weekday()
            week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            return week_start - timedelta(days=days_since_monday)
        elif period == LeaderboardPeriod.MONTH:
            # Start of the current month
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return None  # ALL_TIME - no filtering

    async def get_leaderboard(
        self,
        identity_id: str,
        leaderboard_type: LeaderboardType,
        period: LeaderboardPeriod = LeaderboardPeriod.WEEK,
        limit: int = 100,
    ) -> Leaderboard:
        """Get a leaderboard with proper period filtering."""
        from src.modules.progression.orm import UserLevelORM, StreakORM, XPTransactionORM
        from src.modules.profile.orm import SocialProfileORM

        entries = []
        my_rank = None
        my_value = None
        period_start = self._get_period_start(period)

        if leaderboard_type in (LeaderboardType.GLOBAL_XP, LeaderboardType.FRIENDS_XP):
            # Determine which user IDs to include
            if leaderboard_type == LeaderboardType.FRIENDS_XP:
                eligible_ids = await self._get_friend_ids(identity_id)
                eligible_ids.append(identity_id)  # Include self
            else:
                # Global - only public profiles
                eligible_ids = await self._get_public_profile_ids()
                eligible_ids.append(identity_id)  # Always include self

            if period == LeaderboardPeriod.ALL_TIME:
                # For ALL_TIME, use the total_xp_earned from UserLevelORM (efficient)
                query = (
                    select(UserLevelORM)
                    .where(UserLevelORM.identity_id.in_(eligible_ids))
                    .order_by(desc(UserLevelORM.total_xp_earned))
                    .limit(limit)
                )
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
            else:
                # For WEEK/MONTH, aggregate from XPTransactionORM
                query = (
                    select(
                        XPTransactionORM.identity_id,
                        func.sum(XPTransactionORM.amount).label("period_xp")
                    )
                    .where(
                        XPTransactionORM.identity_id.in_(eligible_ids),
                        XPTransactionORM.created_at >= period_start,
                    )
                    .group_by(XPTransactionORM.identity_id)
                    .order_by(desc(func.sum(XPTransactionORM.amount)))
                    .limit(limit)
                )
                result = await self._db.execute(query)

                rank = 0
                for row in result:
                    rank += 1
                    user_id = row.identity_id
                    xp_value = float(row.period_xp or 0)
                    profile = await self._get_user_profile_data(user_id)
                    is_current = user_id == identity_id

                    entries.append(LeaderboardEntry(
                        rank=rank,
                        identity_id=user_id,
                        username=profile.get("username"),
                        display_name=profile.get("display_name"),
                        avatar_url=profile.get("avatar_url"),
                        value=xp_value,
                        is_current_user=is_current,
                    ))

                    if is_current:
                        my_rank = rank
                        my_value = xp_value

                # If current user not in results, add them with 0 XP
                if my_rank is None:
                    my_value = 0.0

        elif leaderboard_type in (LeaderboardType.GLOBAL_STREAKS, LeaderboardType.FRIENDS_STREAKS):
            # Streak leaderboard (fasting streaks)
            # Note: Streaks are current values, period filtering doesn't apply the same way
            # For now, we show current streak counts regardless of period
            from src.modules.progression.models import StreakType

            if leaderboard_type == LeaderboardType.FRIENDS_STREAKS:
                eligible_ids = await self._get_friend_ids(identity_id)
                eligible_ids.append(identity_id)
            else:
                eligible_ids = await self._get_public_profile_ids()
                eligible_ids.append(identity_id)

            query = (
                select(StreakORM)
                .where(
                    StreakORM.streak_type == StreakType.FASTING,
                    StreakORM.identity_id.in_(eligible_ids),
                )
                .order_by(desc(StreakORM.current_count))
                .limit(limit)
            )
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

        elif leaderboard_type in (LeaderboardType.GLOBAL_WORKOUTS, LeaderboardType.FRIENDS_WORKOUTS):
            # Workout count leaderboard with period filtering
            from src.modules.content.orm import WorkoutSessionORM
            from src.modules.content.models import SessionStatus

            if leaderboard_type == LeaderboardType.FRIENDS_WORKOUTS:
                eligible_ids = await self._get_friend_ids(identity_id)
                eligible_ids.append(identity_id)
            else:
                eligible_ids = await self._get_public_profile_ids()
                eligible_ids.append(identity_id)

            # Build query for completed workouts in the period
            conditions = [
                WorkoutSessionORM.identity_id.in_(eligible_ids),
                WorkoutSessionORM.status == SessionStatus.COMPLETED,
            ]
            if period_start:
                conditions.append(WorkoutSessionORM.completed_at >= period_start)

            query = (
                select(
                    WorkoutSessionORM.identity_id,
                    func.count(WorkoutSessionORM.id).label("workout_count")
                )
                .where(*conditions)
                .group_by(WorkoutSessionORM.identity_id)
                .order_by(desc(func.count(WorkoutSessionORM.id)))
                .limit(limit)
            )
            result = await self._db.execute(query)

            rank = 0
            for row in result:
                rank += 1
                user_id = row.identity_id
                count_value = float(row.workout_count or 0)
                profile = await self._get_user_profile_data(user_id)
                is_current = user_id == identity_id

                entries.append(LeaderboardEntry(
                    rank=rank,
                    identity_id=user_id,
                    username=profile.get("username"),
                    display_name=profile.get("display_name"),
                    avatar_url=profile.get("avatar_url"),
                    value=count_value,
                    is_current_user=is_current,
                ))

                if is_current:
                    my_rank = rank
                    my_value = count_value

            if my_rank is None:
                my_value = 0.0

        elif leaderboard_type in (LeaderboardType.GLOBAL_FASTS, LeaderboardType.FRIENDS_FASTS):
            # Fasting count leaderboard with period filtering
            from src.modules.time_keeper.orm import TimeWindowORM
            from src.modules.time_keeper.models import WindowType, WindowState

            if leaderboard_type == LeaderboardType.FRIENDS_FASTS:
                eligible_ids = await self._get_friend_ids(identity_id)
                eligible_ids.append(identity_id)
            else:
                eligible_ids = await self._get_public_profile_ids()
                eligible_ids.append(identity_id)

            # Build query for completed fasts in the period
            conditions = [
                TimeWindowORM.identity_id.in_(eligible_ids),
                TimeWindowORM.window_type == WindowType.FAST,
                TimeWindowORM.state == WindowState.COMPLETED,
            ]
            if period_start:
                conditions.append(TimeWindowORM.end_time >= period_start)

            query = (
                select(
                    TimeWindowORM.identity_id,
                    func.count(TimeWindowORM.id).label("fast_count")
                )
                .where(*conditions)
                .group_by(TimeWindowORM.identity_id)
                .order_by(desc(func.count(TimeWindowORM.id)))
                .limit(limit)
            )
            result = await self._db.execute(query)

            rank = 0
            for row in result:
                rank += 1
                user_id = row.identity_id
                count_value = float(row.fast_count or 0)
                profile = await self._get_user_profile_data(user_id)
                is_current = user_id == identity_id

                entries.append(LeaderboardEntry(
                    rank=rank,
                    identity_id=user_id,
                    username=profile.get("username"),
                    display_name=profile.get("display_name"),
                    avatar_url=profile.get("avatar_url"),
                    value=count_value,
                    is_current_user=is_current,
                ))

                if is_current:
                    my_rank = rank
                    my_value = count_value

            if my_rank is None:
                my_value = 0.0

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
        is_team_challenge: bool = False,
        team_size_min: int | None = None,
        team_size_max: int | None = None,
    ) -> Challenge:
        """Create a new challenge."""
        if end_date <= start_date:
            raise ValueError("End date must be after start date")

        if end_date < date.today():
            raise ValueError("Challenge cannot end in the past")

        # Validate team challenge parameters
        if is_team_challenge:
            if team_size_min is None:
                team_size_min = 3
            if team_size_max is None:
                team_size_max = 10
            if team_size_min < 2 or team_size_max < 2:
                raise ValueError("Team size must be at least 2")
            if team_size_min > team_size_max:
                raise ValueError("Minimum team size cannot exceed maximum")
            if team_size_max > 10:
                raise ValueError("Maximum team size is 10")

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
            is_team_challenge=is_team_challenge,
            team_size_min=team_size_min if is_team_challenge else None,
            team_size_max=team_size_max if is_team_challenge else None,
        )
        self._db.add(challenge_orm)
        await self._db.flush()

        # Creator automatically joins (for non-team challenges)
        # For team challenges, creator joins when they create/join a team
        if not is_team_challenge:
            await self.join_challenge(identity_id, challenge_orm.id)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="challenge_created",
            related_id=challenge_orm.id,
            metadata={"name": name, "type": challenge_type.value, "is_team": is_team_challenge},
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
        team_id: str | None = None,
    ) -> ChallengeParticipant:
        """Join a challenge."""
        result = await self._db.execute(
            select(ChallengeORM).where(ChallengeORM.id == challenge_id)
        )
        challenge = result.scalar_one_or_none()

        if not challenge:
            raise ValueError("Challenge not found")

        # Team challenges require a team
        if challenge.is_team_challenge and not team_id:
            raise ValueError("Team challenges require joining through a team")

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

        # Validate team if provided
        team_name = None
        if team_id:
            team_result = await self._db.execute(
                select(ChallengeTeamORM).where(
                    ChallengeTeamORM.id == team_id,
                    ChallengeTeamORM.challenge_id == challenge_id,
                )
            )
            team = team_result.scalar_one_or_none()
            if not team:
                raise ValueError("Team not found in this challenge")

            # Check team size limit
            if challenge.team_size_max and team.member_count >= challenge.team_size_max:
                raise ValueError("Team is full")

            team_name = team.name

        participant_orm = ChallengeParticipantORM(
            id=str(uuid4()),
            challenge_id=challenge_id,
            identity_id=identity_id,
            joined_at=datetime.now(UTC),
            current_progress=0,
            completed=False,
            rank=current_count + 1,
            team_id=team_id,
        )
        self._db.add(participant_orm)

        # Update team member count if joining a team
        if team_id:
            await self._db.execute(
                select(ChallengeTeamORM).where(ChallengeTeamORM.id == team_id)
            )
            team_result = await self._db.execute(
                select(ChallengeTeamORM).where(ChallengeTeamORM.id == team_id)
            )
            team = team_result.scalar_one_or_none()
            if team:
                team.member_count += 1

        await self._db.flush()

        await self._record_social_event(
            identity_id=identity_id,
            event_type="challenge_joined",
            related_id=challenge_id,
            metadata={"name": challenge.name, "team_id": team_id, "team_name": team_name},
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
            team_id=team_id,
            team_name=team_name,
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
    # Team Challenges (Sprint 3)
    # =========================================================================

    async def create_challenge_team(
        self,
        identity_id: str,
        challenge_id: str,
        name: str,
    ) -> ChallengeTeam:
        """Create a team within a team challenge."""
        # Get challenge
        result = await self._db.execute(
            select(ChallengeORM).where(ChallengeORM.id == challenge_id)
        )
        challenge = result.scalar_one_or_none()

        if not challenge:
            raise ValueError("Challenge not found")

        if not challenge.is_team_challenge:
            raise ValueError("This challenge does not support teams")

        # Check if team name already exists in this challenge
        existing = await self._db.execute(
            select(ChallengeTeamORM).where(
                ChallengeTeamORM.challenge_id == challenge_id,
                func.lower(ChallengeTeamORM.name) == name.lower(),
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("A team with this name already exists in this challenge")

        # Check if user is already in a team for this challenge
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == challenge_id,
                ChallengeParticipantORM.identity_id == identity_id,
            )
        )
        existing_participant = participant_result.scalar_one_or_none()
        if existing_participant and existing_participant.team_id:
            raise ValueError("You are already on a team in this challenge")

        join_code = secrets.token_hex(4).upper()

        team_orm = ChallengeTeamORM(
            id=str(uuid4()),
            challenge_id=challenge_id,
            name=name,
            created_by=identity_id,
            join_code=join_code,
            total_progress=0,
            member_count=0,
            created_at=datetime.now(UTC),
        )
        self._db.add(team_orm)
        await self._db.flush()

        # Creator joins their team
        await self.join_challenge(identity_id, challenge_id, team_id=team_orm.id)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="team_created",
            related_id=team_orm.id,
            metadata={"name": name, "challenge_id": challenge_id},
        )

        profile = await self._get_user_profile_data(identity_id)
        return ChallengeTeam(
            id=team_orm.id,
            challenge_id=challenge_id,
            name=name,
            created_by=identity_id,
            creator_username=profile.get("username"),
            creator_display_name=profile.get("display_name"),
            join_code=join_code,
            total_progress=0,
            member_count=1,
            created_at=team_orm.created_at,
        )

    async def get_challenge_team(
        self,
        identity_id: str,
        team_id: str,
        include_members: bool = False,
    ) -> ChallengeTeam | None:
        """Get a team by ID."""
        result = await self._db.execute(
            select(ChallengeTeamORM).where(ChallengeTeamORM.id == team_id)
        )
        team_orm = result.scalar_one_or_none()

        if not team_orm:
            return None

        return await self._team_to_model(team_orm, include_members=include_members)

    async def list_challenge_teams(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> list[ChallengeTeam]:
        """List all teams in a challenge."""
        result = await self._db.execute(
            select(ChallengeTeamORM)
            .where(ChallengeTeamORM.challenge_id == challenge_id)
            .order_by(desc(ChallengeTeamORM.total_progress))
        )

        teams = []
        rank = 0
        for team_orm in result.scalars():
            rank += 1
            team = await self._team_to_model(team_orm)
            team.rank = rank
            teams.append(team)

        return teams

    async def get_team_leaderboard(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> ChallengeTeamLeaderboard:
        """Get the team leaderboard for a challenge."""
        teams = await self.list_challenge_teams(identity_id, challenge_id)

        return ChallengeTeamLeaderboard(
            challenge_id=challenge_id,
            teams=teams,
            total_teams=len(teams),
        )

    async def join_team(
        self,
        identity_id: str,
        join_code: str,
    ) -> JoinTeamResponse:
        """Join a team using its join code."""
        # Find team by join code
        result = await self._db.execute(
            select(ChallengeTeamORM).where(
                func.upper(ChallengeTeamORM.join_code) == join_code.upper()
            )
        )
        team = result.scalar_one_or_none()

        if not team:
            raise ValueError("Invalid team join code")

        # Get challenge
        challenge_result = await self._db.execute(
            select(ChallengeORM).where(ChallengeORM.id == team.challenge_id)
        )
        challenge = challenge_result.scalar_one_or_none()

        if not challenge:
            raise ValueError("Challenge not found")

        # Check if user is already in a team for this challenge
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == challenge.id,
                ChallengeParticipantORM.identity_id == identity_id,
            )
        )
        existing_participant = participant_result.scalar_one_or_none()

        if existing_participant:
            if existing_participant.team_id:
                raise ValueError("You are already on a team in this challenge")
            # Update existing participant to join this team
            existing_participant.team_id = team.id
            team.member_count += 1
            await self._db.flush()
        else:
            # Join challenge with this team
            await self.join_challenge(identity_id, challenge.id, team_id=team.id)

        await self._record_social_event(
            identity_id=identity_id,
            event_type="team_joined",
            related_id=team.id,
            metadata={"name": team.name, "challenge_id": challenge.id},
        )

        team_model = await self._team_to_model(team)
        challenge_model = await self._challenge_to_model(challenge, identity_id)

        return JoinTeamResponse(
            team=team_model,
            challenge=challenge_model,
            message=f"Successfully joined team {team.name}!",
        )

    async def leave_team(
        self,
        identity_id: str,
        team_id: str,
    ) -> bool:
        """Leave a team (but stay in challenge if non-team challenge)."""
        # Get team
        result = await self._db.execute(
            select(ChallengeTeamORM).where(ChallengeTeamORM.id == team_id)
        )
        team = result.scalar_one_or_none()

        if not team:
            raise ValueError("Team not found")

        # Check if user is the team creator
        if team.created_by == identity_id:
            # Check if there are other members
            member_count_result = await self._db.execute(
                select(func.count(ChallengeParticipantORM.id)).where(
                    ChallengeParticipantORM.team_id == team_id
                )
            )
            member_count = member_count_result.scalar() or 0
            if member_count > 1:
                raise ValueError("Team creator cannot leave while other members remain")
            # Delete the team if creator is the only member
            await self._db.delete(team)

        # Get participant and update
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == team.challenge_id,
                ChallengeParticipantORM.identity_id == identity_id,
                ChallengeParticipantORM.team_id == team_id,
            )
        )
        participant = participant_result.scalar_one_or_none()

        if not participant:
            raise ValueError("Not a member of this team")

        # For team challenges, leaving the team means leaving the challenge
        await self._db.delete(participant)

        # Update team member count
        team.member_count = max(0, team.member_count - 1)
        team.updated_at = datetime.now(UTC)

        await self._db.flush()

        return True

    async def update_team_progress(
        self,
        challenge_id: str,
    ) -> None:
        """Update all team totals for a challenge."""
        # Get all teams for this challenge
        teams_result = await self._db.execute(
            select(ChallengeTeamORM).where(ChallengeTeamORM.challenge_id == challenge_id)
        )

        for team in teams_result.scalars():
            # Sum up all team members' progress
            progress_result = await self._db.execute(
                select(func.coalesce(func.sum(ChallengeParticipantORM.current_progress), 0.0))
                .where(ChallengeParticipantORM.team_id == team.id)
            )
            total_progress = progress_result.scalar() or 0.0
            team.total_progress = total_progress
            team.updated_at = datetime.now(UTC)

        await self._db.flush()

    async def _team_to_model(
        self,
        team_orm: ChallengeTeamORM,
        include_members: bool = False,
    ) -> ChallengeTeam:
        """Convert team ORM to Pydantic model."""
        profile = await self._get_user_profile_data(team_orm.created_by)

        members = None
        if include_members:
            members_result = await self._db.execute(
                select(ChallengeParticipantORM)
                .where(ChallengeParticipantORM.team_id == team_orm.id)
                .order_by(desc(ChallengeParticipantORM.current_progress))
            )
            members = []
            for member_orm in members_result.scalars():
                member_profile = await self._get_user_profile_data(member_orm.identity_id)
                members.append(ChallengeParticipant(
                    id=member_orm.id,
                    identity_id=member_orm.identity_id,
                    username=member_profile.get("username"),
                    display_name=member_profile.get("display_name"),
                    avatar_url=member_profile.get("avatar_url"),
                    current_progress=member_orm.current_progress,
                    completed=member_orm.completed,
                    completed_at=member_orm.completed_at,
                    rank=member_orm.rank,
                    joined_at=member_orm.joined_at,
                    team_id=team_orm.id,
                    team_name=team_orm.name,
                ))

        return ChallengeTeam(
            id=team_orm.id,
            challenge_id=team_orm.challenge_id,
            name=team_orm.name,
            created_by=team_orm.created_by,
            creator_username=profile.get("username"),
            creator_display_name=profile.get("display_name"),
            join_code=team_orm.join_code,
            total_progress=team_orm.total_progress,
            member_count=team_orm.member_count,
            created_at=team_orm.created_at,
            members=members,
        )

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
    # Duo Streaks
    # =========================================================================

    # Milestone thresholds and XP rewards
    DUO_STREAK_MILESTONES = {
        7: 100,      # Week Warriors - 100 XP each
        14: 150,     # Fortnight Friends - 150 XP each
        30: 300,     # Monthly Masters - 300 XP each
        60: 500,     # Dynamic Duo - 500 XP each
        90: 750,     # Quarter Crew - 750 XP each
        180: 1000,   # Half-Year Heroes - 1000 XP each
        365: 2000,   # Yearly Yoke - 2000 XP each
    }

    async def create_duo_streak_invite(
        self,
        identity_id: str,
        partner_id: str,
        streak_type: DuoStreakType,
    ) -> DuoStreakInvite:
        """Send a duo streak invitation to a friend."""
        if identity_id == partner_id:
            raise ValueError("Cannot start a duo streak with yourself")

        # Verify friendship exists and is accepted
        friendship = await self._get_friendship_record(identity_id, partner_id)
        if not friendship or friendship.status != FriendshipStatus.ACCEPTED:
            raise ValueError("Can only start duo streaks with friends")

        # Check for existing active duo streak of this type
        existing_streak = await self._get_duo_streak_record(identity_id, partner_id, streak_type)
        if existing_streak and not existing_streak.ended_at:
            raise ValueError("Active duo streak already exists with this friend")

        # Check for existing pending invite
        existing_invite = await self._db.execute(
            select(DuoStreakInviteORM).where(
                DuoStreakInviteORM.status == DuoStreakInviteStatus.PENDING,
                DuoStreakInviteORM.streak_type == streak_type,
                or_(
                    and_(
                        DuoStreakInviteORM.from_identity_id == identity_id,
                        DuoStreakInviteORM.to_identity_id == partner_id,
                    ),
                    and_(
                        DuoStreakInviteORM.from_identity_id == partner_id,
                        DuoStreakInviteORM.to_identity_id == identity_id,
                    ),
                ),
            )
        )
        pending = existing_invite.scalar_one_or_none()

        if pending:
            # If partner already sent us an invite, auto-accept it
            if pending.from_identity_id == partner_id:
                return await self._accept_duo_streak_invite(pending, identity_id)
            raise ValueError("Duo streak invitation already sent to this friend")

        # Create new invite
        invite_orm = DuoStreakInviteORM(
            id=str(uuid4()),
            from_identity_id=identity_id,
            to_identity_id=partner_id,
            streak_type=streak_type,
            status=DuoStreakInviteStatus.PENDING,
            created_at=datetime.now(UTC),
        )
        self._db.add(invite_orm)
        await self._db.flush()

        await self._record_social_event(
            identity_id=identity_id,
            event_type="duo_streak_invite_sent",
            related_id=partner_id,
            metadata={"streak_type": streak_type.value},
        )

        profile = await self._get_user_profile_data(identity_id)
        return DuoStreakInvite(
            id=invite_orm.id,
            from_user_id=identity_id,
            from_username=profile.get("username"),
            from_display_name=profile.get("display_name"),
            from_avatar_url=profile.get("avatar_url"),
            streak_type=streak_type,
            status=DuoStreakInviteStatus.PENDING,
            created_at=invite_orm.created_at,
        )

    async def get_duo_streak_invites(
        self,
        identity_id: str,
        direction: str = "incoming",  # "incoming" or "outgoing"
    ) -> list[DuoStreakInvite]:
        """Get pending duo streak invitations."""
        if direction == "incoming":
            query = select(DuoStreakInviteORM).where(
                DuoStreakInviteORM.to_identity_id == identity_id,
                DuoStreakInviteORM.status == DuoStreakInviteStatus.PENDING,
            )
        else:
            query = select(DuoStreakInviteORM).where(
                DuoStreakInviteORM.from_identity_id == identity_id,
                DuoStreakInviteORM.status == DuoStreakInviteStatus.PENDING,
            )

        result = await self._db.execute(query.order_by(desc(DuoStreakInviteORM.created_at)))
        invites = []

        for orm in result.scalars():
            user_id = orm.from_identity_id if direction == "incoming" else orm.to_identity_id
            profile = await self._get_user_profile_data(user_id)
            invites.append(DuoStreakInvite(
                id=orm.id,
                from_user_id=orm.from_identity_id,
                from_username=profile.get("username"),
                from_display_name=profile.get("display_name"),
                from_avatar_url=profile.get("avatar_url"),
                streak_type=orm.streak_type,
                status=orm.status,
                created_at=orm.created_at,
            ))

        return invites

    async def respond_to_duo_streak_invite(
        self,
        identity_id: str,
        invite_id: str,
        accept: bool,
    ) -> DuoStreak | None:
        """Accept or decline a duo streak invitation."""
        result = await self._db.execute(
            select(DuoStreakInviteORM).where(DuoStreakInviteORM.id == invite_id)
        )
        invite = result.scalar_one_or_none()

        if not invite:
            raise ValueError("Invitation not found")

        if invite.to_identity_id != identity_id:
            raise ValueError("This invitation is not for you")

        if invite.status != DuoStreakInviteStatus.PENDING:
            raise ValueError("Invitation is no longer pending")

        invite.responded_at = datetime.now(UTC)

        if accept:
            return await self._accept_duo_streak_invite(invite, identity_id)
        else:
            invite.status = DuoStreakInviteStatus.DECLINED
            await self._db.flush()

            await self._record_social_event(
                identity_id=identity_id,
                event_type="duo_streak_invite_declined",
                related_id=invite.from_identity_id,
            )
            return None

    async def _accept_duo_streak_invite(
        self,
        invite: DuoStreakInviteORM,
        accepting_user_id: str,
    ) -> DuoStreak:
        """Accept a duo streak invitation and create the duo streak."""
        invite.status = DuoStreakInviteStatus.ACCEPTED
        invite.responded_at = datetime.now(UTC)

        # Create the duo streak (ensure id_a < id_b)
        id_a, id_b = (
            (invite.from_identity_id, invite.to_identity_id)
            if invite.from_identity_id < invite.to_identity_id
            else (invite.to_identity_id, invite.from_identity_id)
        )

        duo_streak_orm = DuoStreakORM(
            id=str(uuid4()),
            identity_id_a=id_a,
            identity_id_b=id_b,
            streak_type=invite.streak_type,
            current_count=0,
            longest_count=0,
            started_at=datetime.now(UTC),
        )
        self._db.add(duo_streak_orm)
        await self._db.flush()

        await self._record_social_event(
            identity_id=accepting_user_id,
            event_type="duo_streak_started",
            related_id=duo_streak_orm.id,
            metadata={
                "partner_id": invite.from_identity_id,
                "streak_type": invite.streak_type.value,
            },
        )

        return await self._duo_streak_to_model(duo_streak_orm, accepting_user_id)

    async def get_duo_streaks(
        self,
        identity_id: str,
        active_only: bool = True,
    ) -> list[DuoStreak]:
        """Get user's duo streaks."""
        query = select(DuoStreakORM).where(
            or_(
                DuoStreakORM.identity_id_a == identity_id,
                DuoStreakORM.identity_id_b == identity_id,
            ),
        )

        if active_only:
            query = query.where(DuoStreakORM.ended_at.is_(None))

        query = query.order_by(desc(DuoStreakORM.current_count))
        result = await self._db.execute(query)

        streaks = []
        for orm in result.scalars():
            streaks.append(await self._duo_streak_to_model(orm, identity_id))

        return streaks

    async def get_duo_streak(
        self,
        identity_id: str,
        duo_streak_id: str,
    ) -> DuoStreak | None:
        """Get a specific duo streak."""
        result = await self._db.execute(
            select(DuoStreakORM).where(DuoStreakORM.id == duo_streak_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            return None

        # Verify user is part of this duo streak
        if identity_id not in (orm.identity_id_a, orm.identity_id_b):
            raise ValueError("You are not part of this duo streak")

        return await self._duo_streak_to_model(orm, identity_id)

    async def get_duo_streaks_at_risk(
        self,
        identity_id: str,
    ) -> list[DuoStreak]:
        """Get duo streaks where one person completed today but not the other."""
        today = date.today()
        at_risk_streaks = []

        # Get all active duo streaks for this user
        streaks = await self.get_duo_streaks(identity_id, active_only=True)

        for streak in streaks:
            if streak.at_risk:
                at_risk_streaks.append(streak)

        return at_risk_streaks

    async def end_duo_streak(
        self,
        identity_id: str,
        duo_streak_id: str,
    ) -> bool:
        """End a duo streak."""
        result = await self._db.execute(
            select(DuoStreakORM).where(DuoStreakORM.id == duo_streak_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            raise ValueError("Duo streak not found")

        if identity_id not in (orm.identity_id_a, orm.identity_id_b):
            raise ValueError("You are not part of this duo streak")

        if orm.ended_at:
            raise ValueError("Duo streak already ended")

        orm.ended_at = datetime.now(UTC)
        await self._db.flush()

        # Notify the other user
        partner_id = orm.identity_id_b if orm.identity_id_a == identity_id else orm.identity_id_a

        await self._record_social_event(
            identity_id=identity_id,
            event_type="duo_streak_ended",
            related_id=duo_streak_id,
            metadata={
                "partner_id": partner_id,
                "final_count": orm.current_count,
                "longest_count": orm.longest_count,
            },
        )

        return True

    async def record_duo_streak_activity(
        self,
        identity_id: str,
        activity_type: str,  # "fasting" or "workout"
    ) -> list[DuoStreak]:
        """
        Record activity completion for duo streaks.
        Called when a user completes a fast or workout.
        Returns list of duo streaks that were updated.
        """
        today = date.today()
        updated_streaks = []

        # Map activity type to streak types
        matching_streak_types = [DuoStreakType.ANY_ACTIVITY]
        if activity_type == "fasting":
            matching_streak_types.append(DuoStreakType.FASTING)
        elif activity_type == "workout":
            matching_streak_types.append(DuoStreakType.WORKOUT)

        # Get all active duo streaks for this user matching the activity type
        query = select(DuoStreakORM).where(
            DuoStreakORM.ended_at.is_(None),
            DuoStreakORM.streak_type.in_(matching_streak_types),
            or_(
                DuoStreakORM.identity_id_a == identity_id,
                DuoStreakORM.identity_id_b == identity_id,
            ),
        )
        result = await self._db.execute(query)

        for duo_streak in result.scalars():
            # Determine if user is A or B
            is_user_a = duo_streak.identity_id_a == identity_id
            partner_id = duo_streak.identity_id_b if is_user_a else duo_streak.identity_id_a

            # Get or create daily record for today
            daily = await self._get_or_create_duo_streak_daily(duo_streak.id, today)

            # Check if already completed today (idempotent)
            already_completed = (
                daily.identity_id_a_completed if is_user_a else daily.identity_id_b_completed
            )
            if already_completed:
                # Already recorded for today, skip
                updated_streaks.append(await self._duo_streak_to_model(duo_streak, identity_id))
                continue

            # Mark this user as completed for today
            if is_user_a:
                daily.identity_id_a_completed = True
            else:
                daily.identity_id_b_completed = True

            # Check if BOTH users have now completed today
            if daily.identity_id_a_completed and daily.identity_id_b_completed:
                daily.both_completed = True

                # Increment streak count
                duo_streak.current_count += 1
                duo_streak.last_mutual_date = today

                # Update longest count if needed
                if duo_streak.current_count > duo_streak.longest_count:
                    duo_streak.longest_count = duo_streak.current_count

                # Check for milestones
                await self._check_duo_streak_milestone(duo_streak, identity_id, partner_id)

                # Record event for feed
                await self._record_social_event(
                    identity_id=identity_id,
                    event_type="duo_streak_day_completed",
                    related_id=duo_streak.id,
                    metadata={
                        "partner_id": partner_id,
                        "streak_type": duo_streak.streak_type.value,
                        "current_count": duo_streak.current_count,
                    },
                )

            updated_streaks.append(await self._duo_streak_to_model(duo_streak, identity_id))

        await self._db.flush()
        return updated_streaks

    async def check_duo_streak_breaks(self) -> int:
        """
        Check for broken duo streaks. Should be called by a scheduled job at midnight UTC.
        Returns the number of streaks that were broken.
        """
        yesterday = date.today() - timedelta(days=1)
        broken_count = 0

        # Find all active duo streaks with a current count > 0
        query = select(DuoStreakORM).where(
            DuoStreakORM.ended_at.is_(None),
            DuoStreakORM.current_count > 0,
        )
        result = await self._db.execute(query)

        for duo_streak in result.scalars():
            # Check if both completed yesterday
            daily_result = await self._db.execute(
                select(DuoStreakDailyORM).where(
                    DuoStreakDailyORM.duo_streak_id == duo_streak.id,
                    DuoStreakDailyORM.activity_date == yesterday,
                )
            )
            daily = daily_result.scalar_one_or_none()

            # If no daily record or not both completed, streak is broken
            if not daily or not daily.both_completed:
                previous_count = duo_streak.current_count
                duo_streak.current_count = 0

                # Record event for both users
                for user_id in [duo_streak.identity_id_a, duo_streak.identity_id_b]:
                    partner_id = (
                        duo_streak.identity_id_b
                        if user_id == duo_streak.identity_id_a
                        else duo_streak.identity_id_a
                    )
                    await self._record_social_event(
                        identity_id=user_id,
                        event_type="duo_streak_broken",
                        related_id=duo_streak.id,
                        metadata={
                            "partner_id": partner_id,
                            "streak_type": duo_streak.streak_type.value,
                            "previous_count": previous_count,
                        },
                    )

                broken_count += 1

        await self._db.flush()
        return broken_count

    async def _check_duo_streak_milestone(
        self,
        duo_streak: DuoStreakORM,
        user_id: str,
        partner_id: str,
    ) -> DuoStreakMilestone | None:
        """Check if a milestone was reached and award XP."""
        current_count = duo_streak.current_count

        # Check if current count matches a milestone
        if current_count not in self.DUO_STREAK_MILESTONES:
            return None

        xp_reward = self.DUO_STREAK_MILESTONES[current_count]

        # Check if milestone already recorded
        existing = await self._db.execute(
            select(DuoStreakMilestoneORM).where(
                DuoStreakMilestoneORM.duo_streak_id == duo_streak.id,
                DuoStreakMilestoneORM.milestone_days == current_count,
            )
        )
        if existing.scalar_one_or_none():
            return None  # Already recorded

        # Create milestone record
        milestone_orm = DuoStreakMilestoneORM(
            id=str(uuid4()),
            duo_streak_id=duo_streak.id,
            milestone_days=current_count,
            reached_at=datetime.now(UTC),
            xp_awarded_a=False,
            xp_awarded_b=False,
        )
        self._db.add(milestone_orm)

        # Award XP to both users via progression service
        if self._progression:
            for uid in [duo_streak.identity_id_a, duo_streak.identity_id_b]:
                try:
                    await self._progression.add_xp(
                        identity_id=uid,
                        amount=xp_reward,
                        source=f"duo_streak_milestone_{current_count}",
                        description=f"{current_count}-day duo streak milestone",
                    )
                    # Mark as awarded
                    if uid == duo_streak.identity_id_a:
                        milestone_orm.xp_awarded_a = True
                    else:
                        milestone_orm.xp_awarded_b = True
                except Exception:
                    pass  # Don't fail the main operation

        # Record event for feed
        await self._record_social_event(
            identity_id=user_id,
            event_type="duo_streak_milestone",
            related_id=duo_streak.id,
            metadata={
                "partner_id": partner_id,
                "streak_type": duo_streak.streak_type.value,
                "milestone_days": current_count,
                "xp_reward": xp_reward,
            },
        )

        await self._db.flush()

        return DuoStreakMilestone(
            id=milestone_orm.id,
            duo_streak_id=duo_streak.id,
            milestone_days=current_count,
            reached_at=milestone_orm.reached_at,
        )

    async def _get_duo_streak_record(
        self,
        identity_id: str,
        partner_id: str,
        streak_type: DuoStreakType,
    ) -> DuoStreakORM | None:
        """Get duo streak record between two users."""
        id_a, id_b = (
            (identity_id, partner_id)
            if identity_id < partner_id
            else (partner_id, identity_id)
        )

        result = await self._db.execute(
            select(DuoStreakORM).where(
                DuoStreakORM.identity_id_a == id_a,
                DuoStreakORM.identity_id_b == id_b,
                DuoStreakORM.streak_type == streak_type,
            )
        )
        return result.scalar_one_or_none()

    async def _get_or_create_duo_streak_daily(
        self,
        duo_streak_id: str,
        activity_date: date,
    ) -> DuoStreakDailyORM:
        """Get or create a daily record for a duo streak."""
        result = await self._db.execute(
            select(DuoStreakDailyORM).where(
                DuoStreakDailyORM.duo_streak_id == duo_streak_id,
                DuoStreakDailyORM.activity_date == activity_date,
            )
        )
        daily = result.scalar_one_or_none()

        if not daily:
            daily = DuoStreakDailyORM(
                id=str(uuid4()),
                duo_streak_id=duo_streak_id,
                activity_date=activity_date,
                identity_id_a_completed=False,
                identity_id_b_completed=False,
                both_completed=False,
                created_at=datetime.now(UTC),
            )
            self._db.add(daily)
            await self._db.flush()

        return daily

    async def _duo_streak_to_model(
        self,
        orm: DuoStreakORM,
        viewer_id: str,
    ) -> DuoStreak:
        """Convert duo streak ORM to model from viewer's perspective."""
        # Determine partner
        is_user_a = orm.identity_id_a == viewer_id
        partner_id = orm.identity_id_b if is_user_a else orm.identity_id_a

        # Get partner profile
        profile = await self._get_user_profile_data(partner_id)

        # Get today's completion status
        today = date.today()
        daily_result = await self._db.execute(
            select(DuoStreakDailyORM).where(
                DuoStreakDailyORM.duo_streak_id == orm.id,
                DuoStreakDailyORM.activity_date == today,
            )
        )
        daily = daily_result.scalar_one_or_none()

        i_completed_today = False
        partner_completed_today = False

        if daily:
            i_completed_today = (
                daily.identity_id_a_completed if is_user_a else daily.identity_id_b_completed
            )
            partner_completed_today = (
                daily.identity_id_b_completed if is_user_a else daily.identity_id_a_completed
            )

        # At risk = one completed but not the other
        at_risk = (i_completed_today != partner_completed_today) and orm.current_count > 0

        return DuoStreak(
            id=orm.id,
            partner_id=partner_id,
            partner_username=profile.get("username"),
            partner_display_name=profile.get("display_name"),
            partner_avatar_url=profile.get("avatar_url"),
            streak_type=orm.streak_type,
            current_count=orm.current_count,
            longest_count=orm.longest_count,
            last_mutual_date=orm.last_mutual_date,
            started_at=orm.started_at,
            ended_at=orm.ended_at,
            i_completed_today=i_completed_today,
            partner_completed_today=partner_completed_today,
            at_risk=at_risk,
        )

    # =========================================================================
    # Activity Feed
    # =========================================================================

    # Activity type to preference field mapping
    ACTIVITY_PREFERENCE_MAP = {
        FeedActivityType.FAST_COMPLETED: "share_fasts",
        FeedActivityType.WORKOUT_COMPLETED: "share_workouts",
        FeedActivityType.ACHIEVEMENT_UNLOCKED: "share_achievements",
        FeedActivityType.LEVEL_UP: "share_level_ups",
        FeedActivityType.STREAK_MILESTONE: "share_streaks",
        FeedActivityType.DUO_STREAK_MILESTONE: "share_duo_streaks",
    }

    async def get_friends_feed(
        self,
        identity_id: str,
        limit: int = 20,
        before: datetime | None = None,
    ) -> list[FeedItem]:
        """Get activity feed from friends (cursor-based pagination)."""
        import json

        # Get friend IDs
        friend_ids = await self._get_friend_ids(identity_id)
        if not friend_ids:
            return []

        # Build query
        query = (
            select(FeedItemORM)
            .where(FeedItemORM.identity_id.in_(friend_ids))
        )

        if before:
            query = query.where(FeedItemORM.created_at < before)

        query = query.order_by(desc(FeedItemORM.created_at)).limit(limit)

        result = await self._db.execute(query)
        items = []

        for orm in result.scalars():
            i_cheered = await self._has_cheered(identity_id, orm.id)
            metadata = None
            if orm.item_metadata:
                try:
                    metadata = json.loads(orm.item_metadata)
                except (json.JSONDecodeError, TypeError):
                    metadata = None

            items.append(FeedItem(
                id=orm.id,
                identity_id=orm.identity_id,
                activity_type=orm.activity_type,
                title=orm.title,
                subtitle=orm.subtitle,
                metadata=metadata,
                cheer_count=orm.cheer_count,
                created_at=orm.created_at,
                display_name=orm.display_name,
                avatar_url=orm.avatar_url,
                i_cheered=i_cheered,
            ))

        return items

    async def get_my_activity(
        self,
        identity_id: str,
        limit: int = 20,
        before: datetime | None = None,
    ) -> list[FeedItem]:
        """Get user's own recent activity."""
        import json

        query = select(FeedItemORM).where(FeedItemORM.identity_id == identity_id)

        if before:
            query = query.where(FeedItemORM.created_at < before)

        query = query.order_by(desc(FeedItemORM.created_at)).limit(limit)

        result = await self._db.execute(query)
        items = []

        for orm in result.scalars():
            i_cheered = await self._has_cheered(identity_id, orm.id)
            metadata = None
            if orm.item_metadata:
                try:
                    metadata = json.loads(orm.item_metadata)
                except (json.JSONDecodeError, TypeError):
                    metadata = None

            items.append(FeedItem(
                id=orm.id,
                identity_id=orm.identity_id,
                activity_type=orm.activity_type,
                title=orm.title,
                subtitle=orm.subtitle,
                metadata=metadata,
                cheer_count=orm.cheer_count,
                created_at=orm.created_at,
                display_name=orm.display_name,
                avatar_url=orm.avatar_url,
                i_cheered=i_cheered,
            ))

        return items

    async def cheer_feed_item(
        self,
        identity_id: str,
        feed_item_id: str,
    ) -> FeedItem:
        """Add a cheer to a feed item."""
        import json

        # Get the feed item
        result = await self._db.execute(
            select(FeedItemORM).where(FeedItemORM.id == feed_item_id)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise ValueError("Feed item not found")

        # Check if already cheered
        if await self._has_cheered(identity_id, feed_item_id):
            raise ValueError("Already cheered this item")

        # Add cheer record
        cheer = FeedCheerORM(
            id=str(uuid4()),
            feed_item_id=feed_item_id,
            identity_id=identity_id,
            created_at=datetime.now(UTC),
        )
        self._db.add(cheer)

        # Increment cheer count
        item.cheer_count += 1
        await self._db.flush()

        # Record event for the item owner
        await self._record_social_event(
            identity_id=item.identity_id,
            event_type="feed_item_cheered",
            related_id=feed_item_id,
            metadata={"cheered_by": identity_id},
        )

        metadata = None
        if item.item_metadata:
            try:
                metadata = json.loads(item.item_metadata)
            except (json.JSONDecodeError, TypeError):
                metadata = None

        return FeedItem(
            id=item.id,
            identity_id=item.identity_id,
            activity_type=item.activity_type,
            title=item.title,
            subtitle=item.subtitle,
            metadata=metadata,
            cheer_count=item.cheer_count,
            created_at=item.created_at,
            display_name=item.display_name,
            avatar_url=item.avatar_url,
            i_cheered=True,
        )

    async def uncheer_feed_item(
        self,
        identity_id: str,
        feed_item_id: str,
    ) -> bool:
        """Remove a cheer from a feed item."""
        # Get the feed item
        result = await self._db.execute(
            select(FeedItemORM).where(FeedItemORM.id == feed_item_id)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise ValueError("Feed item not found")

        # Find and delete the cheer
        cheer_result = await self._db.execute(
            select(FeedCheerORM).where(
                FeedCheerORM.feed_item_id == feed_item_id,
                FeedCheerORM.identity_id == identity_id,
            )
        )
        cheer = cheer_result.scalar_one_or_none()

        if not cheer:
            raise ValueError("Cheer not found")

        await self._db.delete(cheer)

        # Decrement cheer count
        item.cheer_count = max(0, item.cheer_count - 1)
        await self._db.flush()

        return True

    async def get_feed_preferences(
        self,
        identity_id: str,
    ) -> FeedPreferences:
        """Get user's feed sharing preferences."""
        result = await self._db.execute(
            select(FeedPreferencesORM).where(FeedPreferencesORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            # Return defaults if no preferences set
            return FeedPreferences()

        return FeedPreferences(
            share_fasts=orm.share_fasts,
            share_workouts=orm.share_workouts,
            share_achievements=orm.share_achievements,
            share_level_ups=orm.share_level_ups,
            share_streaks=orm.share_streaks,
            share_duo_streaks=orm.share_duo_streaks,
        )

    async def update_feed_preferences(
        self,
        identity_id: str,
        share_fasts: bool | None = None,
        share_workouts: bool | None = None,
        share_achievements: bool | None = None,
        share_level_ups: bool | None = None,
        share_streaks: bool | None = None,
        share_duo_streaks: bool | None = None,
    ) -> FeedPreferences:
        """Update user's feed sharing preferences."""
        result = await self._db.execute(
            select(FeedPreferencesORM).where(FeedPreferencesORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            # Create new preferences
            orm = FeedPreferencesORM(
                identity_id=identity_id,
                share_fasts=share_fasts if share_fasts is not None else True,
                share_workouts=share_workouts if share_workouts is not None else True,
                share_achievements=share_achievements if share_achievements is not None else True,
                share_level_ups=share_level_ups if share_level_ups is not None else True,
                share_streaks=share_streaks if share_streaks is not None else True,
                share_duo_streaks=share_duo_streaks if share_duo_streaks is not None else True,
            )
            self._db.add(orm)
        else:
            # Update existing
            if share_fasts is not None:
                orm.share_fasts = share_fasts
            if share_workouts is not None:
                orm.share_workouts = share_workouts
            if share_achievements is not None:
                orm.share_achievements = share_achievements
            if share_level_ups is not None:
                orm.share_level_ups = share_level_ups
            if share_streaks is not None:
                orm.share_streaks = share_streaks
            if share_duo_streaks is not None:
                orm.share_duo_streaks = share_duo_streaks
            orm.updated_at = datetime.now(UTC)

        await self._db.flush()

        return FeedPreferences(
            share_fasts=orm.share_fasts,
            share_workouts=orm.share_workouts,
            share_achievements=orm.share_achievements,
            share_level_ups=orm.share_level_ups,
            share_streaks=orm.share_streaks,
            share_duo_streaks=orm.share_duo_streaks,
        )

    async def create_feed_item(
        self,
        identity_id: str,
        activity_type: FeedActivityType,
        title: str,
        subtitle: str | None = None,
        metadata: dict | None = None,
    ) -> FeedItem | None:
        """
        Create a feed item for the user's activity.
        Returns None if user has disabled sharing for this activity type.
        """
        import json

        # Check user's preferences
        prefs = await self.get_feed_preferences(identity_id)
        pref_field = self.ACTIVITY_PREFERENCE_MAP.get(activity_type)
        if pref_field and not getattr(prefs, pref_field, True):
            return None  # User has disabled sharing for this type

        # Get user profile data for denormalization
        profile = await self._get_user_profile_data(identity_id)

        # Create feed item
        item = FeedItemORM(
            id=str(uuid4()),
            identity_id=identity_id,
            activity_type=activity_type.value,
            title=title,
            subtitle=subtitle,
            item_metadata=json.dumps(metadata) if metadata else None,
            cheer_count=0,
            created_at=datetime.now(UTC),
            display_name=profile.get("display_name"),
            avatar_url=profile.get("avatar_url"),
        )
        self._db.add(item)
        await self._db.flush()

        return FeedItem(
            id=item.id,
            identity_id=item.identity_id,
            activity_type=item.activity_type,
            title=item.title,
            subtitle=item.subtitle,
            metadata=metadata,
            cheer_count=0,
            created_at=item.created_at,
            display_name=item.display_name,
            avatar_url=item.avatar_url,
            i_cheered=False,
        )

    async def _has_cheered(
        self,
        identity_id: str,
        feed_item_id: str,
    ) -> bool:
        """Check if user has cheered a feed item."""
        result = await self._db.execute(
            select(FeedCheerORM).where(
                FeedCheerORM.feed_item_id == feed_item_id,
                FeedCheerORM.identity_id == identity_id,
            )
        )
        return result.scalar_one_or_none() is not None

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

        # Get team info if team challenge
        team_count = None
        my_team_id = None
        my_team_name = None

        if orm.is_team_challenge:
            # Get team count
            team_count_result = await self._db.execute(
                select(func.count(ChallengeTeamORM.id)).where(
                    ChallengeTeamORM.challenge_id == orm.id
                )
            )
            team_count = team_count_result.scalar() or 0

            # Get viewer's team if participating
            if participant and participant.team_id:
                team_result = await self._db.execute(
                    select(ChallengeTeamORM).where(ChallengeTeamORM.id == participant.team_id)
                )
                team = team_result.scalar_one_or_none()
                if team:
                    my_team_id = team.id
                    my_team_name = team.name

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
            is_team_challenge=orm.is_team_challenge,
            team_size_min=orm.team_size_min,
            team_size_max=orm.team_size_max,
            team_count=team_count,
            my_team_id=my_team_id,
            my_team_name=my_team_name,
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

    # =========================================================================
    # Challenge Templates
    # =========================================================================

    async def get_challenge_templates(
        self,
        active_only: bool = True,
    ) -> list[ChallengeTemplate]:
        """
        Get available challenge templates.

        Returns pre-built templates sorted by sort_order for quick challenge creation.
        """
        query = select(ChallengeTemplateORM)

        if active_only:
            query = query.where(ChallengeTemplateORM.is_active == True)  # noqa: E712

        query = query.order_by(ChallengeTemplateORM.sort_order)
        result = await self._db.execute(query)

        templates = []
        for orm in result.scalars():
            # Convert challenge_type to lowercase for enum compatibility
            # DB stores uppercase (FASTING_STREAK), enum uses lowercase (fasting_streak)
            challenge_type_str = orm.challenge_type.lower() if orm.challenge_type else "total_xp"
            templates.append(ChallengeTemplate(
                id=orm.id,
                name=orm.name,
                description=orm.description,
                challenge_type=ChallengeType(challenge_type_str),
                duration_days=orm.duration_days,
                goal_value=orm.goal_value,
                goal_unit=orm.goal_unit,
                icon=orm.icon,
                is_active=orm.is_active,
                sort_order=orm.sort_order,
            ))

        return templates

    async def create_challenge_from_template(
        self,
        identity_id: str,
        template_id: str,
        invite_friend_ids: list[str] | None = None,
        custom_name: str | None = None,
        start_date: date | None = None,
    ) -> Challenge:
        """
        Create a challenge from a pre-built template.

        Args:
            identity_id: The user creating the challenge
            template_id: The template to use
            invite_friend_ids: Optional list of friend IDs to auto-invite
            custom_name: Optional custom name (defaults to template name)
            start_date: Optional start date (defaults to tomorrow)

        Returns:
            The created challenge

        Raises:
            ValueError: If template not found or invalid friends
        """
        # Get the template
        result = await self._db.execute(
            select(ChallengeTemplateORM).where(
                ChallengeTemplateORM.id == template_id,
                ChallengeTemplateORM.is_active == True,  # noqa: E712
            )
        )
        template = result.scalar_one_or_none()

        if not template:
            raise ValueError("Challenge template not found or inactive")

        # Calculate dates
        if start_date is None:
            start_date = date.today() + timedelta(days=1)  # Default: tomorrow

        end_date = start_date + timedelta(days=template.duration_days - 1)

        # Use custom name or template name
        challenge_name = custom_name or template.name

        # Create the challenge using existing method
        # Convert challenge_type to lowercase for enum compatibility
        challenge_type_str = template.challenge_type.lower() if template.challenge_type else "total_xp"
        challenge = await self.create_challenge(
            identity_id=identity_id,
            name=challenge_name,
            challenge_type=ChallengeType(challenge_type_str),
            goal_value=template.goal_value,
            start_date=start_date,
            end_date=end_date,
            description=template.description,
            goal_unit=template.goal_unit,
            is_public=False,  # Template challenges are private by default
            max_participants=50,
        )

        # Auto-invite friends if specified
        if invite_friend_ids:
            for friend_id in invite_friend_ids:
                try:
                    # Verify they are actually friends
                    friendship = await self._get_friendship_record(identity_id, friend_id)
                    if friendship and friendship.status == FriendshipStatus.ACCEPTED:
                        # Record invitation event (actual invite would be via notification)
                        await self._record_social_event(
                            identity_id=identity_id,
                            event_type="challenge_invite_sent",
                            related_id=challenge.id,
                            metadata={
                                "friend_id": friend_id,
                                "challenge_name": challenge_name,
                                "template_id": template_id,
                            },
                        )
                except Exception:
                    # Don't fail if one invite fails
                    pass

        await self._record_social_event(
            identity_id=identity_id,
            event_type="challenge_created_from_template",
            related_id=challenge.id,
            metadata={
                "template_id": template_id,
                "template_name": template.name,
                "invited_count": len(invite_friend_ids) if invite_friend_ids else 0,
            },
        )

        return challenge

    # =========================================================================
    # Achievement Celebrations (Sprint 2)
    # =========================================================================

    CELEBRATION_XP_REWARD = 5  # XP awarded to both celebrator and achiever

    async def celebrate_achievement(
        self,
        identity_id: str,
        user_achievement_id: str,
    ) -> "CelebrateAchievementResponse":
        """
        Celebrate a friend's achievement.

        Both the celebrator and the achiever receive 5 XP.
        Each user can only celebrate an achievement once.

        Args:
            identity_id: The user celebrating
            user_achievement_id: The user_achievement record to celebrate

        Returns:
            CelebrateAchievementResponse with celebration details

        Raises:
            ValueError: If achievement not found, not friends, self-celebration, or already celebrated
        """
        from src.modules.social.models import (
            AchievementCelebration,
            CelebrateAchievementResponse,
        )
        from src.modules.social.orm import AchievementCelebrationORM
        from src.modules.progression.orm import UserAchievementORM

        # Get the user achievement
        result = await self._db.execute(
            select(UserAchievementORM).where(
                UserAchievementORM.id == user_achievement_id,
                UserAchievementORM.is_unlocked == True,  # noqa: E712
            )
        )
        user_achievement = result.scalar_one_or_none()

        if not user_achievement:
            raise ValueError("Achievement not found or not unlocked")

        achiever_id = user_achievement.identity_id

        # Cannot self-celebrate
        if achiever_id == identity_id:
            raise ValueError("Cannot celebrate your own achievement")

        # Must be friends
        friendship = await self._get_friendship_record(identity_id, achiever_id)
        if not friendship or friendship.status != FriendshipStatus.ACCEPTED:
            raise ValueError("Can only celebrate friends' achievements")

        # Check if already celebrated
        existing_result = await self._db.execute(
            select(AchievementCelebrationORM).where(
                AchievementCelebrationORM.user_achievement_id == user_achievement_id,
                AchievementCelebrationORM.celebrator_identity_id == identity_id,
            )
        )
        if existing_result.scalar_one_or_none():
            raise ValueError("Already celebrated this achievement")

        # Create the celebration record
        celebration_orm = AchievementCelebrationORM(
            id=str(uuid4()),
            user_achievement_id=user_achievement_id,
            celebrator_identity_id=identity_id,
            created_at=datetime.now(UTC),
            xp_awarded_achiever=False,
            xp_awarded_celebrator=False,
        )
        self._db.add(celebration_orm)
        await self._db.flush()

        # Award XP to both parties via progression service
        xp_awarded_celebrator = 0
        xp_awarded_achiever = 0

        if self._progression:
            try:
                # Award XP to celebrator
                await self._progression.award_xp(
                    identity_id=identity_id,
                    amount=self.CELEBRATION_XP_REWARD,
                    transaction_type="celebration_given",
                    description="Celebrated a friend's achievement",
                    related_id=user_achievement_id,
                )
                celebration_orm.xp_awarded_celebrator = True
                xp_awarded_celebrator = self.CELEBRATION_XP_REWARD

                # Award XP to achiever
                await self._progression.award_xp(
                    identity_id=achiever_id,
                    amount=self.CELEBRATION_XP_REWARD,
                    transaction_type="celebration_received",
                    description="A friend celebrated your achievement",
                    related_id=user_achievement_id,
                )
                celebration_orm.xp_awarded_achiever = True
                xp_awarded_achiever = self.CELEBRATION_XP_REWARD
            except Exception:
                # XP award failed but celebration still recorded
                pass

        await self._db.flush()

        # Record the event
        await self._record_social_event(
            identity_id=identity_id,
            event_type="achievement_celebrated",
            related_id=user_achievement_id,
            metadata={
                "achiever_id": achiever_id,
                "achievement_id": user_achievement.achievement_id,
            },
        )

        # Get celebrator profile for response
        profile = await self._get_user_profile_data(identity_id)

        celebration = AchievementCelebration(
            id=celebration_orm.id,
            user_achievement_id=user_achievement_id,
            celebrator_identity_id=identity_id,
            celebrator_username=profile.get("username"),
            celebrator_display_name=profile.get("display_name"),
            celebrator_avatar_url=profile.get("avatar_url"),
            created_at=celebration_orm.created_at,
        )

        return CelebrateAchievementResponse(
            celebration=celebration,
            xp_awarded_celebrator=xp_awarded_celebrator,
            xp_awarded_achiever=xp_awarded_achiever,
            message="You celebrated this achievement!",
        )

    async def get_achievement_celebrations(
        self,
        user_achievement_id: str,
    ) -> "AchievementCelebrationList":
        """
        Get all celebrations for an achievement.

        Args:
            user_achievement_id: The user_achievement record ID

        Returns:
            AchievementCelebrationList with all celebrations
        """
        from src.modules.social.models import (
            AchievementCelebration,
            AchievementCelebrationList,
        )
        from src.modules.social.orm import AchievementCelebrationORM
        from src.modules.progression.orm import UserAchievementORM

        # Verify the achievement exists
        result = await self._db.execute(
            select(UserAchievementORM).where(UserAchievementORM.id == user_achievement_id)
        )
        if not result.scalar_one_or_none():
            raise ValueError("Achievement not found")

        # Get all celebrations
        celebrations_result = await self._db.execute(
            select(AchievementCelebrationORM)
            .where(AchievementCelebrationORM.user_achievement_id == user_achievement_id)
            .order_by(desc(AchievementCelebrationORM.created_at))
        )

        celebrations = []
        for orm in celebrations_result.scalars():
            profile = await self._get_user_profile_data(orm.celebrator_identity_id)
            celebrations.append(AchievementCelebration(
                id=orm.id,
                user_achievement_id=user_achievement_id,
                celebrator_identity_id=orm.celebrator_identity_id,
                celebrator_username=profile.get("username"),
                celebrator_display_name=profile.get("display_name"),
                celebrator_avatar_url=profile.get("avatar_url"),
                created_at=orm.created_at,
            ))

        return AchievementCelebrationList(
            user_achievement_id=user_achievement_id,
            celebrations=celebrations,
            total_count=len(celebrations),
        )

    async def has_celebrated_achievement(
        self,
        identity_id: str,
        user_achievement_id: str,
    ) -> bool:
        """Check if a user has already celebrated an achievement."""
        from src.modules.social.orm import AchievementCelebrationORM

        result = await self._db.execute(
            select(AchievementCelebrationORM).where(
                AchievementCelebrationORM.user_achievement_id == user_achievement_id,
                AchievementCelebrationORM.celebrator_identity_id == identity_id,
            )
        )
        return result.scalar_one_or_none() is not None

    # =========================================================================
    # Team Messaging (Sprint 4)
    # =========================================================================

    MESSAGE_EDIT_WINDOW_MINUTES = 15

    async def _verify_team_membership(
        self,
        identity_id: str,
        team_id: str,
    ) -> ChallengeTeamORM | None:
        """Verify user is a member of the team. Returns team if valid."""
        # Get the team
        result = await self._db.execute(
            select(ChallengeTeamORM).where(ChallengeTeamORM.id == team_id)
        )
        team = result.scalar_one_or_none()
        if not team:
            return None

        # Check if user is a participant in the challenge with this team
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == team.challenge_id,
                ChallengeParticipantORM.identity_id == identity_id,
                ChallengeParticipantORM.team_id == team_id,
            )
        )
        if not participant_result.scalar_one_or_none():
            return None

        return team

    def _parse_mentions(self, content: str) -> list[str]:
        """Parse @mentions from message content. Returns list of usernames."""
        import re
        # Match @username patterns (alphanumeric and underscore)
        pattern = r'@(\w+)'
        return re.findall(pattern, content)

    async def send_team_message(
        self,
        identity_id: str,
        team_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> "TeamMessage":
        """
        Send a message to a team chat.

        Args:
            identity_id: The sender
            team_id: The team to send to
            content: Message content (max 2000 chars)
            mentions: Optional list of identity_ids to mention

        Returns:
            The created message

        Raises:
            ValueError: If not a team member or content too long
        """
        from src.modules.social.models import TeamMessage, TeamMessageReaction
        from src.modules.social.orm import TeamMessageORM, TeamMessageMentionORM

        # Verify team membership
        team = await self._verify_team_membership(identity_id, team_id)
        if not team:
            raise ValueError("Not a member of this team")

        if len(content) > 2000:
            raise ValueError("Message content too long (max 2000 characters)")

        now = datetime.now(UTC)

        # Create the message
        message_orm = TeamMessageORM(
            id=str(uuid4()),
            team_id=team_id,
            sender_id=identity_id,
            content=content,
            created_at=now,
        )
        self._db.add(message_orm)
        await self._db.flush()

        # Process mentions
        mention_ids = mentions or []
        valid_mentions = []

        if mention_ids:
            # Validate mentioned users are team members
            for mentioned_id in mention_ids:
                if mentioned_id == identity_id:
                    continue  # Skip self-mentions
                participant_result = await self._db.execute(
                    select(ChallengeParticipantORM).where(
                        ChallengeParticipantORM.challenge_id == team.challenge_id,
                        ChallengeParticipantORM.team_id == team_id,
                        ChallengeParticipantORM.identity_id == mentioned_id,
                    )
                )
                if participant_result.scalar_one_or_none():
                    valid_mentions.append(mentioned_id)

                    # Create mention record
                    mention_orm = TeamMessageMentionORM(
                        id=str(uuid4()),
                        message_id=message_orm.id,
                        mentioned_id=mentioned_id,
                    )
                    self._db.add(mention_orm)

        await self._db.flush()

        # Get sender profile
        profile = await self._get_user_profile_data(identity_id)

        # Record event
        await self._record_social_event(
            identity_id=identity_id,
            event_type="team_message_sent",
            related_id=message_orm.id,
            metadata={
                "team_id": team_id,
                "mention_count": len(valid_mentions),
            },
        )

        return TeamMessage(
            id=message_orm.id,
            team_id=team_id,
            sender_id=identity_id,
            sender_username=profile.get("username"),
            sender_display_name=profile.get("display_name"),
            sender_avatar_url=profile.get("avatar_url"),
            content=content,
            created_at=message_orm.created_at,
            reactions=[],
            mentions=valid_mentions,
        )

    async def get_team_messages(
        self,
        identity_id: str,
        team_id: str,
        limit: int = 50,
        before: str | None = None,
    ) -> "TeamMessagePage":
        """
        Get paginated messages for a team.

        Args:
            identity_id: The requesting user
            team_id: The team to get messages for
            limit: Max messages to return (default 50)
            before: Message ID cursor for pagination

        Returns:
            TeamMessagePage with messages and pagination info
        """
        from src.modules.social.models import TeamMessage, TeamMessageReaction, TeamMessagePage
        from src.modules.social.orm import TeamMessageORM, TeamMessageReactionORM, TeamMessageMentionORM

        # Verify team membership
        if not await self._verify_team_membership(identity_id, team_id):
            raise ValueError("Not a member of this team")

        # Build query
        query = (
            select(TeamMessageORM)
            .where(TeamMessageORM.team_id == team_id)
            .order_by(desc(TeamMessageORM.created_at))
            .limit(limit + 1)  # Fetch one extra to check for more
        )

        if before:
            # Get the cursor message's created_at
            cursor_result = await self._db.execute(
                select(TeamMessageORM.created_at).where(TeamMessageORM.id == before)
            )
            cursor_time = cursor_result.scalar_one_or_none()
            if cursor_time:
                query = query.where(TeamMessageORM.created_at < cursor_time)

        result = await self._db.execute(query)
        message_orms = list(result.scalars())

        # Check if there are more messages
        has_more = len(message_orms) > limit
        if has_more:
            message_orms = message_orms[:limit]

        messages = []
        for msg_orm in message_orms:
            # Get sender profile
            profile = await self._get_user_profile_data(msg_orm.sender_id)

            # Get reactions
            reactions_result = await self._db.execute(
                select(TeamMessageReactionORM).where(TeamMessageReactionORM.message_id == msg_orm.id)
            )
            reaction_orms = list(reactions_result.scalars())

            # Group reactions by emoji
            reaction_map: dict[str, list[str]] = {}
            for r in reaction_orms:
                if r.emoji not in reaction_map:
                    reaction_map[r.emoji] = []
                reaction_map[r.emoji].append(r.identity_id)

            reactions = [
                TeamMessageReaction(
                    emoji=emoji,
                    count=len(user_ids),
                    users=user_ids,
                    i_reacted=identity_id in user_ids,
                )
                for emoji, user_ids in reaction_map.items()
            ]

            # Get mentions
            mentions_result = await self._db.execute(
                select(TeamMessageMentionORM.mentioned_id).where(
                    TeamMessageMentionORM.message_id == msg_orm.id
                )
            )
            mentions = [m for m in mentions_result.scalars()]

            messages.append(TeamMessage(
                id=msg_orm.id,
                team_id=msg_orm.team_id,
                sender_id=msg_orm.sender_id,
                sender_username=profile.get("username"),
                sender_display_name=profile.get("display_name"),
                sender_avatar_url=profile.get("avatar_url"),
                content=msg_orm.content if not msg_orm.deleted_at else "",
                created_at=msg_orm.created_at,
                edited_at=msg_orm.edited_at,
                is_deleted=msg_orm.deleted_at is not None,
                reactions=reactions,
                mentions=mentions,
            ))

        next_cursor = messages[-1].id if messages and has_more else None

        return TeamMessagePage(
            messages=messages,
            has_more=has_more,
            next_cursor=next_cursor,
        )

    async def edit_team_message(
        self,
        identity_id: str,
        message_id: str,
        content: str,
    ) -> "TeamMessage":
        """
        Edit a message within the 15-minute window.

        Args:
            identity_id: The requesting user (must be sender)
            message_id: The message to edit
            content: New content

        Returns:
            The updated message

        Raises:
            ValueError: If not sender, message deleted, or edit window expired
        """
        from src.modules.social.models import TeamMessage
        from src.modules.social.orm import TeamMessageORM

        result = await self._db.execute(
            select(TeamMessageORM).where(TeamMessageORM.id == message_id)
        )
        msg_orm = result.scalar_one_or_none()

        if not msg_orm:
            raise ValueError("Message not found")

        if msg_orm.sender_id != identity_id:
            raise ValueError("Only the sender can edit this message")

        if msg_orm.deleted_at:
            raise ValueError("Cannot edit deleted message")

        # Check edit window
        now = datetime.now(UTC)
        time_since_creation = (now - msg_orm.created_at).total_seconds() / 60
        if time_since_creation > self.MESSAGE_EDIT_WINDOW_MINUTES:
            raise ValueError(f"Edit window expired (messages can only be edited within {self.MESSAGE_EDIT_WINDOW_MINUTES} minutes)")

        if len(content) > 2000:
            raise ValueError("Message content too long (max 2000 characters)")

        # Update the message
        msg_orm.content = content
        msg_orm.edited_at = now
        await self._db.flush()

        # Get the full message
        return await self._get_team_message(identity_id, msg_orm)

    async def delete_team_message(
        self,
        identity_id: str,
        message_id: str,
    ) -> bool:
        """
        Soft-delete a message (sender only).

        Args:
            identity_id: The requesting user (must be sender)
            message_id: The message to delete

        Returns:
            True if deleted

        Raises:
            ValueError: If not sender or already deleted
        """
        from src.modules.social.orm import TeamMessageORM

        result = await self._db.execute(
            select(TeamMessageORM).where(TeamMessageORM.id == message_id)
        )
        msg_orm = result.scalar_one_or_none()

        if not msg_orm:
            raise ValueError("Message not found")

        if msg_orm.sender_id != identity_id:
            raise ValueError("Only the sender can delete this message")

        if msg_orm.deleted_at:
            raise ValueError("Message already deleted")

        msg_orm.deleted_at = datetime.now(UTC)
        await self._db.flush()

        return True

    async def add_message_reaction(
        self,
        identity_id: str,
        message_id: str,
        emoji: str,
    ) -> "TeamMessage":
        """
        Add an emoji reaction to a message.

        Args:
            identity_id: The user adding the reaction
            message_id: The message to react to
            emoji: The emoji reaction (must be valid TeamMessageEmoji)

        Returns:
            The updated message

        Raises:
            ValueError: If not team member or invalid emoji
        """
        from src.modules.social.models import TeamMessageEmoji
        from src.modules.social.orm import TeamMessageORM, TeamMessageReactionORM

        # Validate emoji
        if not any(e.value == emoji for e in TeamMessageEmoji):
            raise ValueError(f"Invalid emoji. Must be one of: {[e.value for e in TeamMessageEmoji]}")

        # Get the message
        result = await self._db.execute(
            select(TeamMessageORM).where(TeamMessageORM.id == message_id)
        )
        msg_orm = result.scalar_one_or_none()

        if not msg_orm:
            raise ValueError("Message not found")

        # Verify team membership
        if not await self._verify_team_membership(identity_id, msg_orm.team_id):
            raise ValueError("Not a member of this team")

        if msg_orm.deleted_at:
            raise ValueError("Cannot react to deleted message")

        # Check if already reacted with this emoji
        existing_result = await self._db.execute(
            select(TeamMessageReactionORM).where(
                TeamMessageReactionORM.message_id == message_id,
                TeamMessageReactionORM.identity_id == identity_id,
                TeamMessageReactionORM.emoji == emoji,
            )
        )
        if existing_result.scalar_one_or_none():
            raise ValueError("Already reacted with this emoji")

        # Add the reaction
        reaction_orm = TeamMessageReactionORM(
            id=str(uuid4()),
            message_id=message_id,
            identity_id=identity_id,
            emoji=emoji,
            created_at=datetime.now(UTC),
        )
        self._db.add(reaction_orm)
        await self._db.flush()

        return await self._get_team_message(identity_id, msg_orm)

    async def remove_message_reaction(
        self,
        identity_id: str,
        message_id: str,
        emoji: str,
    ) -> "TeamMessage":
        """
        Remove an emoji reaction from a message.

        Args:
            identity_id: The user removing the reaction
            message_id: The message
            emoji: The emoji to remove

        Returns:
            The updated message

        Raises:
            ValueError: If reaction doesn't exist
        """
        from src.modules.social.orm import TeamMessageORM, TeamMessageReactionORM

        # Get the message
        result = await self._db.execute(
            select(TeamMessageORM).where(TeamMessageORM.id == message_id)
        )
        msg_orm = result.scalar_one_or_none()

        if not msg_orm:
            raise ValueError("Message not found")

        # Find and remove the reaction
        reaction_result = await self._db.execute(
            select(TeamMessageReactionORM).where(
                TeamMessageReactionORM.message_id == message_id,
                TeamMessageReactionORM.identity_id == identity_id,
                TeamMessageReactionORM.emoji == emoji,
            )
        )
        reaction_orm = reaction_result.scalar_one_or_none()

        if not reaction_orm:
            raise ValueError("Reaction not found")

        await self._db.delete(reaction_orm)
        await self._db.flush()

        return await self._get_team_message(identity_id, msg_orm)

    async def mark_team_read(
        self,
        identity_id: str,
        team_id: str,
        last_read_message_id: str | None = None,
    ) -> bool:
        """
        Mark team messages as read.

        Args:
            identity_id: The user
            team_id: The team
            last_read_message_id: Optional specific message ID, or marks all as read

        Returns:
            True if updated
        """
        from src.modules.social.orm import TeamMessageORM, TeamMessageReadORM

        # Verify team membership
        if not await self._verify_team_membership(identity_id, team_id):
            raise ValueError("Not a member of this team")

        now = datetime.now(UTC)

        # If no specific message, get the latest
        if not last_read_message_id:
            latest_result = await self._db.execute(
                select(TeamMessageORM.id)
                .where(TeamMessageORM.team_id == team_id)
                .order_by(desc(TeamMessageORM.created_at))
                .limit(1)
            )
            latest_id = latest_result.scalar_one_or_none()
            last_read_message_id = latest_id

        # Upsert read record
        existing_result = await self._db.execute(
            select(TeamMessageReadORM).where(
                TeamMessageReadORM.team_id == team_id,
                TeamMessageReadORM.identity_id == identity_id,
            )
        )
        read_orm = existing_result.scalar_one_or_none()

        if read_orm:
            read_orm.last_read_at = now
            read_orm.last_read_message_id = last_read_message_id
        else:
            read_orm = TeamMessageReadORM(
                id=str(uuid4()),
                team_id=team_id,
                identity_id=identity_id,
                last_read_at=now,
                last_read_message_id=last_read_message_id,
            )
            self._db.add(read_orm)

        await self._db.flush()
        return True

    async def get_team_unread_counts(
        self,
        identity_id: str,
    ) -> list["TeamUnreadCount"]:
        """
        Get unread message counts for all teams the user is in.

        Returns:
            List of TeamUnreadCount for each team with unread messages
        """
        from src.modules.social.models import TeamUnreadCount
        from src.modules.social.orm import TeamMessageORM, TeamMessageReadORM

        # Get all teams the user is in
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.identity_id == identity_id,
                ChallengeParticipantORM.team_id.isnot(None),
            )
        )
        participants = list(participant_result.scalars())

        unread_counts = []
        for participant in participants:
            team_id = participant.team_id
            if not team_id:
                continue

            # Get team info
            team_result = await self._db.execute(
                select(ChallengeTeamORM).where(ChallengeTeamORM.id == team_id)
            )
            team = team_result.scalar_one_or_none()
            if not team:
                continue

            # Get user's last read time
            read_result = await self._db.execute(
                select(TeamMessageReadORM).where(
                    TeamMessageReadORM.team_id == team_id,
                    TeamMessageReadORM.identity_id == identity_id,
                )
            )
            read_record = read_result.scalar_one_or_none()

            # Count unread messages
            unread_query = (
                select(func.count(TeamMessageORM.id))
                .where(
                    TeamMessageORM.team_id == team_id,
                    TeamMessageORM.deleted_at.is_(None),
                    TeamMessageORM.sender_id != identity_id,  # Don't count own messages
                )
            )

            if read_record and read_record.last_read_at:
                unread_query = unread_query.where(
                    TeamMessageORM.created_at > read_record.last_read_at
                )

            count_result = await self._db.execute(unread_query)
            unread_count = count_result.scalar() or 0

            # Get last message time
            last_msg_result = await self._db.execute(
                select(TeamMessageORM.created_at)
                .where(TeamMessageORM.team_id == team_id)
                .order_by(desc(TeamMessageORM.created_at))
                .limit(1)
            )
            last_message_at = last_msg_result.scalar_one_or_none()

            if unread_count > 0 or last_message_at:
                unread_counts.append(TeamUnreadCount(
                    team_id=team_id,
                    team_name=team.name,
                    challenge_id=team.challenge_id,
                    unread_count=unread_count,
                    last_message_at=last_message_at,
                ))

        return unread_counts

    async def get_team_read_receipts(
        self,
        identity_id: str,
        team_id: str,
    ) -> list["TeamReadReceipt"]:
        """
        Get read receipts for all team members.

        Returns:
            List of TeamReadReceipt showing when each member last read
        """
        from src.modules.social.models import TeamReadReceipt
        from src.modules.social.orm import TeamMessageReadORM

        # Verify team membership
        team = await self._verify_team_membership(identity_id, team_id)
        if not team:
            raise ValueError("Not a member of this team")

        # Get all team members
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == team.challenge_id,
                ChallengeParticipantORM.team_id == team_id,
            )
        )
        participants = list(participant_result.scalars())

        receipts = []
        for participant in participants:
            profile = await self._get_user_profile_data(participant.identity_id)

            # Get read record
            read_result = await self._db.execute(
                select(TeamMessageReadORM).where(
                    TeamMessageReadORM.team_id == team_id,
                    TeamMessageReadORM.identity_id == participant.identity_id,
                )
            )
            read_record = read_result.scalar_one_or_none()

            receipts.append(TeamReadReceipt(
                identity_id=participant.identity_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
                last_read_at=read_record.last_read_at if read_record else participant.joined_at,
                last_read_message_id=read_record.last_read_message_id if read_record else None,
            ))

        return receipts

    async def get_team_members_for_mention(
        self,
        identity_id: str,
        team_id: str,
        query: str | None = None,
    ) -> list["TeamMemberForMention"]:
        """
        Get team members for @mention autocomplete.

        Args:
            identity_id: The requesting user
            team_id: The team
            query: Optional search query to filter by username/display_name

        Returns:
            List of team members (excluding self)
        """
        from src.modules.social.models import TeamMemberForMention

        # Verify team membership
        team = await self._verify_team_membership(identity_id, team_id)
        if not team:
            raise ValueError("Not a member of this team")

        # Get all team members except self
        participant_result = await self._db.execute(
            select(ChallengeParticipantORM).where(
                ChallengeParticipantORM.challenge_id == team.challenge_id,
                ChallengeParticipantORM.team_id == team_id,
                ChallengeParticipantORM.identity_id != identity_id,
            )
        )
        participants = list(participant_result.scalars())

        members = []
        for participant in participants:
            profile = await self._get_user_profile_data(participant.identity_id)

            # Filter by query if provided
            if query:
                query_lower = query.lower()
                username = profile.get("username", "") or ""
                display_name = profile.get("display_name", "") or ""
                if query_lower not in username.lower() and query_lower not in display_name.lower():
                    continue

            members.append(TeamMemberForMention(
                identity_id=participant.identity_id,
                username=profile.get("username"),
                display_name=profile.get("display_name"),
                avatar_url=profile.get("avatar_url"),
            ))

        return members

    async def _get_team_message(
        self,
        viewer_id: str,
        msg_orm: "TeamMessageORM",
    ) -> "TeamMessage":
        """Helper to convert ORM message to model with all related data."""
        from src.modules.social.models import TeamMessage, TeamMessageReaction
        from src.modules.social.orm import TeamMessageORM, TeamMessageReactionORM, TeamMessageMentionORM

        profile = await self._get_user_profile_data(msg_orm.sender_id)

        # Get reactions
        reactions_result = await self._db.execute(
            select(TeamMessageReactionORM).where(TeamMessageReactionORM.message_id == msg_orm.id)
        )
        reaction_orms = list(reactions_result.scalars())

        # Group reactions by emoji
        reaction_map: dict[str, list[str]] = {}
        for r in reaction_orms:
            if r.emoji not in reaction_map:
                reaction_map[r.emoji] = []
            reaction_map[r.emoji].append(r.identity_id)

        reactions = [
            TeamMessageReaction(
                emoji=emoji,
                count=len(user_ids),
                users=user_ids,
                i_reacted=viewer_id in user_ids,
            )
            for emoji, user_ids in reaction_map.items()
        ]

        # Get mentions
        mentions_result = await self._db.execute(
            select(TeamMessageMentionORM.mentioned_id).where(
                TeamMessageMentionORM.message_id == msg_orm.id
            )
        )
        mentions = [m for m in mentions_result.scalars()]

        return TeamMessage(
            id=msg_orm.id,
            team_id=msg_orm.team_id,
            sender_id=msg_orm.sender_id,
            sender_username=profile.get("username"),
            sender_display_name=profile.get("display_name"),
            sender_avatar_url=profile.get("avatar_url"),
            content=msg_orm.content if not msg_orm.deleted_at else "",
            created_at=msg_orm.created_at,
            edited_at=msg_orm.edited_at,
            is_deleted=msg_orm.deleted_at is not None,
            reactions=reactions,
            mentions=mentions,
        )
