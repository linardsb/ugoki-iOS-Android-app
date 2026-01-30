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
    # Team challenge fields (Sprint 3)
    is_team_challenge: bool = False
    team_size_min: int | None = None
    team_size_max: int | None = None
    team_count: int | None = None
    my_team_id: str | None = None
    my_team_name: str | None = None


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
    # Team fields (Sprint 3)
    team_id: str | None = None
    team_name: str | None = None


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
    # Team challenge fields (Sprint 3)
    is_team_challenge: bool = False
    team_size_min: int | None = Field(None, ge=2, le=10)
    team_size_max: int | None = Field(None, ge=2, le=10)


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


# =========================================================================
# Achievement Celebrations Models (Sprint 2)
# =========================================================================

class AchievementCelebration(BaseModel):
    """A celebration of a friend's achievement."""
    id: str
    user_achievement_id: str
    celebrator_identity_id: str
    celebrator_username: str | None = None
    celebrator_display_name: str | None = None
    celebrator_avatar_url: str | None = None
    created_at: datetime


class CelebrateAchievementResponse(BaseModel):
    """Response after celebrating an achievement."""
    celebration: AchievementCelebration
    xp_awarded_celebrator: int = 5
    xp_awarded_achiever: int = 5
    message: str = "You celebrated this achievement!"


class AchievementCelebrationList(BaseModel):
    """List of celebrations for an achievement."""
    user_achievement_id: str
    celebrations: list[AchievementCelebration] = []
    total_count: int = 0


# =========================================================================
# Team Challenges Models (Sprint 3)
# =========================================================================

class ChallengeTeam(BaseModel):
    """A team within a team challenge."""
    id: str
    challenge_id: str
    name: str
    created_by: str
    creator_username: str | None = None
    creator_display_name: str | None = None
    join_code: str
    total_progress: float = 0
    member_count: int = 0
    rank: int | None = None
    created_at: datetime
    # Members (optional, populated when fetching single team)
    members: list["ChallengeParticipant"] | None = None


class ChallengeTeamLeaderboard(BaseModel):
    """Leaderboard of teams within a challenge."""
    challenge_id: str
    teams: list[ChallengeTeam] = []
    total_teams: int = 0


class CreateTeamRequest(BaseModel):
    """Request to create a team within a team challenge."""
    name: str = Field(..., min_length=2, max_length=100)


class JoinTeamRequest(BaseModel):
    """Request to join a team using its join code."""
    join_code: str = Field(..., min_length=8, max_length=8)


class JoinTeamResponse(BaseModel):
    """Response after joining a team."""
    team: ChallengeTeam
    challenge: Challenge
    message: str = "Successfully joined team!"
