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


class DuoStreakType(str, Enum):
    FASTING = "fasting"
    WORKOUT = "workout"
    ANY_ACTIVITY = "any_activity"


class DuoStreakInviteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class FeedActivityType(str, Enum):
    FAST_COMPLETED = "fast_completed"
    WORKOUT_COMPLETED = "workout_completed"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    LEVEL_UP = "level_up"
    STREAK_MILESTONE = "streak_milestone"
    DUO_STREAK_MILESTONE = "duo_streak_milestone"


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


# =========================================================================
# Duo Streaks Models
# =========================================================================

class DuoStreak(BaseModel):
    """A shared streak between two users."""
    id: str
    partner_id: str
    partner_username: str | None = None
    partner_display_name: str | None = None
    partner_avatar_url: str | None = None
    streak_type: DuoStreakType
    current_count: int = 0
    longest_count: int = 0
    last_mutual_date: date | None = None
    started_at: datetime
    ended_at: datetime | None = None
    # Today's status
    i_completed_today: bool = False
    partner_completed_today: bool = False
    at_risk: bool = False  # One completed, other hasn't


class DuoStreakInvite(BaseModel):
    """Pending duo streak invitation."""
    id: str
    from_user_id: str
    from_username: str | None = None
    from_display_name: str | None = None
    from_avatar_url: str | None = None
    streak_type: DuoStreakType
    status: DuoStreakInviteStatus
    created_at: datetime


class DuoStreakMilestone(BaseModel):
    """A milestone reached in a duo streak."""
    id: str
    duo_streak_id: str
    milestone_days: int  # 7, 14, 30, 60, 90, 180, 365
    reached_at: datetime


class CreateDuoStreakRequest(BaseModel):
    """Request to invite someone to a duo streak."""
    partner_id: str
    streak_type: DuoStreakType = DuoStreakType.FASTING


class RespondDuoStreakInviteRequest(BaseModel):
    """Response to a duo streak invitation."""
    accept: bool


# =========================================================================
# Activity Feed Models
# =========================================================================

class FeedItem(BaseModel):
    """An activity feed item."""
    id: str
    identity_id: str
    activity_type: str
    title: str
    subtitle: str | None = None
    metadata: dict | None = None
    cheer_count: int = 0
    created_at: datetime
    display_name: str | None = None
    avatar_url: str | None = None
    # Viewer-specific fields
    i_cheered: bool = False


class FeedCheer(BaseModel):
    """A cheer on a feed item."""
    id: str
    feed_item_id: str
    identity_id: str
    display_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime


class FeedPreferences(BaseModel):
    """User's feed sharing preferences."""
    share_fasts: bool = True
    share_workouts: bool = True
    share_achievements: bool = True
    share_level_ups: bool = True
    share_streaks: bool = True
    share_duo_streaks: bool = True


class UpdateFeedPreferencesRequest(BaseModel):
    """Request to update feed preferences."""
    share_fasts: bool | None = None
    share_workouts: bool | None = None
    share_achievements: bool | None = None
    share_level_ups: bool | None = None
    share_streaks: bool | None = None
    share_duo_streaks: bool | None = None


# =========================================================================
# Challenge Templates Models
# =========================================================================

class ChallengeTemplate(BaseModel):
    """A pre-built challenge template."""
    id: str
    name: str
    description: str | None = None
    challenge_type: ChallengeType
    duration_days: int
    goal_value: float
    goal_unit: str | None = None
    icon: str | None = None
    is_active: bool = True
    sort_order: int = 0


class CreateChallengeFromTemplateRequest(BaseModel):
    """Request to create a challenge from a template."""
    template_id: str
    invite_friend_ids: list[str] = []
    custom_name: str | None = None
    start_date: date | None = None  # Default: tomorrow
