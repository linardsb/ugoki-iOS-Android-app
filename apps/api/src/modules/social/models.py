from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field


# =========================================================================
# Enums
# =========================================================================

class FriendshipStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    BLOCKED = "blocked"


class ChallengeType(str, Enum):
    FASTING_STREAK = "fasting_streak"
    WORKOUT_COUNT = "workout_count"
    TOTAL_XP = "total_xp"
    CONSISTENCY = "consistency"


class ChallengeStatus(str, Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"


class LeaderboardType(str, Enum):
    GLOBAL_XP = "global_xp"
    GLOBAL_STREAKS = "global_streaks"
    FRIENDS_XP = "friends_xp"
    FRIENDS_STREAKS = "friends_streaks"
    CHALLENGE = "challenge"


class LeaderboardPeriod(str, Enum):
    WEEK = "week"
    MONTH = "month"
    ALL_TIME = "all_time"


# =========================================================================
# Core Models
# =========================================================================

class Friendship(BaseModel):
    """Represents a friendship between two users."""
    id: str
    friend_id: str
    friend_username: str | None = None
    friend_display_name: str | None = None
    friend_avatar_url: str | None = None
    friend_level: int | None = None
    status: FriendshipStatus
    requested_by_me: bool
    created_at: datetime
    accepted_at: datetime | None = None


class FriendRequest(BaseModel):
    """Incoming or outgoing friend request."""
    id: str
    user_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    level: int | None = None
    created_at: datetime


class Follow(BaseModel):
    """Represents a follow relationship."""
    id: str
    user_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    level: int | None = None
    created_at: datetime


class Challenge(BaseModel):
    """A group challenge/competition."""
    id: str
    name: str
    description: str | None = None
    challenge_type: ChallengeType
    goal_value: float
    goal_unit: str | None = None
    start_date: date
    end_date: date
    created_by: str
    creator_username: str | None = None
    join_code: str
    is_public: bool = False
    max_participants: int = 50
    participant_count: int = 0
    status: ChallengeStatus
    my_progress: float | None = None
    my_rank: int | None = None
    is_participating: bool = False
    days_remaining: int | None = None
    created_at: datetime


class ChallengeParticipant(BaseModel):
    """A participant in a challenge."""
    id: str
    identity_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    current_progress: float = 0
    completed: bool = False
    completed_at: datetime | None = None
    rank: int | None = None
    joined_at: datetime


class LeaderboardEntry(BaseModel):
    """A single entry in a leaderboard."""
    rank: int
    identity_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    value: float
    is_current_user: bool = False


class Leaderboard(BaseModel):
    """A leaderboard with entries."""
    type: LeaderboardType
    period: LeaderboardPeriod
    entries: list[LeaderboardEntry] = []
    my_rank: int | None = None
    my_value: float | None = None
    total_participants: int = 0
    updated_at: datetime


class PublicUserProfile(BaseModel):
    """Privacy-filtered public profile for social features."""
    identity_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    level: int | None = None
    title: str | None = None
    streaks: dict[str, int] | None = None
    achievement_count: int | None = None
    is_friend: bool = False
    is_following: bool = False
    is_followed_by: bool = False
    friendship_status: FriendshipStatus | None = None


class ShareContent(BaseModel):
    """Generated shareable content."""
    title: str
    message: str
    image_url: str | None = None
    deep_link: str | None = None


# =========================================================================
# Request Models
# =========================================================================

class SendFriendRequestRequest(BaseModel):
    """Request to send a friend request."""
    friend_code: str | None = None
    username: str | None = None


class RespondFriendRequestRequest(BaseModel):
    """Response to a friend request."""
    accept: bool


class CreateChallengeRequest(BaseModel):
    """Request to create a challenge."""
    name: str = Field(..., min_length=3, max_length=100)
    description: str | None = Field(None, max_length=500)
    challenge_type: ChallengeType
    goal_value: float = Field(..., gt=0)
    goal_unit: str | None = None
    start_date: date
    end_date: date
    is_public: bool = False
    max_participants: int = Field(50, ge=2, le=1000)


class GenerateShareContentRequest(BaseModel):
    """Request to generate shareable content."""
    share_type: str  # achievement, streak, level_up, workout, challenge_win
    related_id: str | None = None
    custom_message: str | None = None
