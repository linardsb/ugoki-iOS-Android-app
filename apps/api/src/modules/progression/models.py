from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field


class StreakType(str, Enum):
    """Types of streaks that can be tracked."""
    FASTING = "fasting"           # Consecutive days completing fasts
    WORKOUT = "workout"           # Consecutive days with workouts
    LOGGING = "logging"           # Consecutive days logging weight/food
    APP_USAGE = "app_usage"       # Consecutive days opening app


class XPTransactionType(str, Enum):
    """Types of XP transactions."""
    FAST_COMPLETED = "fast_completed"
    WORKOUT_COMPLETED = "workout_completed"
    WEIGHT_LOGGED = "weight_logged"
    STREAK_BONUS = "streak_bonus"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    DAILY_LOGIN = "daily_login"
    LEVEL_UP_BONUS = "level_up_bonus"


class AchievementType(str, Enum):
    """Categories of achievements."""
    STREAK = "streak"             # Streak milestones
    FASTING = "fasting"           # Fasting achievements
    WORKOUT = "workout"           # Workout achievements
    WEIGHT = "weight"             # Weight loss milestones
    SOCIAL = "social"             # Social/community achievements
    SPECIAL = "special"           # Special/seasonal achievements


class Streak(BaseModel):
    """
    Tracks consecutive day streaks for various activities.
    """
    id: str = Field(..., description="Opaque streak reference")
    identity_id: str
    streak_type: StreakType
    current_count: int = Field(0, ge=0)
    longest_count: int = Field(0, ge=0)
    last_activity_date: date | None = None
    started_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class XPTransaction(BaseModel):
    """
    Record of XP earned or spent.
    """
    id: str = Field(..., description="Opaque transaction reference")
    identity_id: str
    amount: int = Field(..., description="Positive for earned, negative for spent")
    transaction_type: XPTransactionType
    description: str | None = None
    related_id: str | None = Field(None, description="Related entity (window_id, achievement_id)")
    created_at: datetime


class UserLevel(BaseModel):
    """
    User's current level and XP status.
    """
    identity_id: str
    current_level: int = Field(1, ge=1)
    current_xp: int = Field(0, ge=0)
    xp_for_next_level: int
    xp_progress_percent: float = Field(0, ge=0, le=100)
    total_xp_earned: int = Field(0, ge=0)
    title: str = Field("Beginner")


class Achievement(BaseModel):
    """
    An achievement that can be unlocked.
    """
    id: str
    name: str
    description: str
    achievement_type: AchievementType
    xp_reward: int = Field(0, ge=0)
    icon: str | None = None
    requirement_value: int = Field(1, ge=1, description="Value needed to unlock")
    is_hidden: bool = False


class UserAchievement(BaseModel):
    """
    An achievement unlocked by a user.
    """
    id: str
    identity_id: str
    achievement_id: str
    achievement: Achievement | None = None
    unlocked_at: datetime
    progress: int = Field(0, ge=0, description="Progress toward achievement")
    is_unlocked: bool = False


class UserProgression(BaseModel):
    """
    Complete progression state for a user.
    """
    identity_id: str
    level: UserLevel
    streaks: list[Streak]
    recent_achievements: list[UserAchievement]
    total_achievements: int


# Request/Response models
class RecordActivityRequest(BaseModel):
    """Record an activity that may affect streaks and XP."""
    streak_type: StreakType
    activity_date: date | None = None  # Defaults to today


class AwardXPRequest(BaseModel):
    """Manually award XP."""
    amount: int = Field(..., gt=0)
    transaction_type: XPTransactionType
    description: str | None = None
    related_id: str | None = None


class StreakResponse(BaseModel):
    """Response with streak info and any bonuses earned."""
    streak: Streak
    xp_earned: int = 0
    level_up: bool = False
    new_level: int | None = None
    achievements_unlocked: list[Achievement] = []
