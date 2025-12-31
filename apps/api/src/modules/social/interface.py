from abc import ABC, abstractmethod
from datetime import date

from src.modules.social.models import (
    FriendshipStatus,
    ChallengeType,
    LeaderboardType,
    LeaderboardPeriod,
    Friendship,
    FriendRequest,
    Follow,
    Challenge,
    ChallengeParticipant,
    Leaderboard,
    PublicUserProfile,
    ShareContent,
)


class SocialInterface(ABC):
    """Interface for the Social module."""

    # =========================================================================
    # Friendships
    # =========================================================================

    @abstractmethod
    async def send_friend_request(
        self,
        identity_id: str,
        friend_code: str | None = None,
        username: str | None = None,
    ) -> Friendship:
        """Send a friend request to another user."""
        pass

    @abstractmethod
    async def get_incoming_friend_requests(
        self,
        identity_id: str,
    ) -> list[FriendRequest]:
        """Get pending friend requests received by the user."""
        pass

    @abstractmethod
    async def get_outgoing_friend_requests(
        self,
        identity_id: str,
    ) -> list[FriendRequest]:
        """Get pending friend requests sent by the user."""
        pass

    @abstractmethod
    async def respond_to_friend_request(
        self,
        identity_id: str,
        request_id: str,
        accept: bool,
    ) -> Friendship | None:
        """Accept or decline a friend request."""
        pass

    @abstractmethod
    async def get_friends(
        self,
        identity_id: str,
        status: FriendshipStatus | None = None,
    ) -> list[Friendship]:
        """Get user's friends."""
        pass

    @abstractmethod
    async def remove_friend(
        self,
        identity_id: str,
        friend_id: str,
    ) -> bool:
        """Remove a friend."""
        pass

    @abstractmethod
    async def block_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> bool:
        """Block a user."""
        pass

    @abstractmethod
    async def unblock_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> bool:
        """Unblock a user."""
        pass

    # =========================================================================
    # Follows
    # =========================================================================

    @abstractmethod
    async def follow_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> Follow:
        """Follow a user."""
        pass

    @abstractmethod
    async def unfollow_user(
        self,
        identity_id: str,
        target_id: str,
    ) -> bool:
        """Unfollow a user."""
        pass

    @abstractmethod
    async def get_followers(
        self,
        identity_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Follow]:
        """Get users who follow this user."""
        pass

    @abstractmethod
    async def get_following(
        self,
        identity_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Follow]:
        """Get users this user follows."""
        pass

    # =========================================================================
    # Public Profiles
    # =========================================================================

    @abstractmethod
    async def get_public_profile(
        self,
        viewer_id: str,
        target_id: str,
    ) -> PublicUserProfile:
        """Get a user's public profile with privacy filtering."""
        pass

    @abstractmethod
    async def search_users(
        self,
        identity_id: str,
        query: str,
        limit: int = 20,
    ) -> list[PublicUserProfile]:
        """Search for users by username or display name."""
        pass

    # =========================================================================
    # Leaderboards
    # =========================================================================

    @abstractmethod
    async def get_leaderboard(
        self,
        identity_id: str,
        leaderboard_type: LeaderboardType,
        period: LeaderboardPeriod = LeaderboardPeriod.WEEK,
        limit: int = 100,
    ) -> Leaderboard:
        """Get a leaderboard."""
        pass

    # =========================================================================
    # Challenges
    # =========================================================================

    @abstractmethod
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
        pass

    @abstractmethod
    async def get_challenge(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> Challenge | None:
        """Get a challenge by ID."""
        pass

    @abstractmethod
    async def list_challenges(
        self,
        identity_id: str,
        include_public: bool = True,
        active_only: bool = True,
    ) -> list[Challenge]:
        """List available challenges."""
        pass

    @abstractmethod
    async def join_challenge(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> ChallengeParticipant:
        """Join a challenge."""
        pass

    @abstractmethod
    async def join_challenge_by_code(
        self,
        identity_id: str,
        join_code: str,
    ) -> ChallengeParticipant:
        """Join a challenge using its join code."""
        pass

    @abstractmethod
    async def leave_challenge(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> bool:
        """Leave a challenge."""
        pass

    @abstractmethod
    async def get_challenge_leaderboard(
        self,
        identity_id: str,
        challenge_id: str,
    ) -> list[ChallengeParticipant]:
        """Get the leaderboard for a challenge."""
        pass

    @abstractmethod
    async def get_my_challenges(
        self,
        identity_id: str,
        active_only: bool = True,
    ) -> list[Challenge]:
        """Get challenges the user is participating in."""
        pass

    @abstractmethod
    async def update_challenge_progress(
        self,
        identity_id: str,
    ) -> None:
        """Update user's progress in all active challenges."""
        pass

    # =========================================================================
    # Sharing
    # =========================================================================

    @abstractmethod
    async def generate_share_content(
        self,
        identity_id: str,
        share_type: str,
        related_id: str | None = None,
        custom_message: str | None = None,
    ) -> ShareContent:
        """Generate shareable content for an achievement, streak, etc."""
        pass
