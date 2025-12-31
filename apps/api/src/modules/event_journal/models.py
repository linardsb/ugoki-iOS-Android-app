"""
EVENT_JOURNAL Module - Pydantic Models

Defines the core ACTIVITY_EVENT primitive and related types.
Events are immutable records of significant user activities.
"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class EventCategory(str, Enum):
    """High-level category for grouping events."""
    AUTH = "auth"
    FASTING = "fasting"
    WORKOUT = "workout"
    PROGRESSION = "progression"
    PROFILE = "profile"
    METRICS = "metrics"
    COACH = "coach"
    CONTENT = "content"
    SOCIAL = "social"


class EventType(str, Enum):
    """
    Specific event types.

    Naming convention: {noun}_{past_tense_verb}
    """
    # Auth events
    IDENTITY_CREATED = "identity_created"
    LOGIN = "login"
    LOGOUT = "logout"

    # Fasting events
    FAST_STARTED = "fast_started"
    FAST_PAUSED = "fast_paused"
    FAST_RESUMED = "fast_resumed"
    FAST_COMPLETED = "fast_completed"
    FAST_ABANDONED = "fast_abandoned"
    FAST_EXTENDED = "fast_extended"

    # Workout events
    WORKOUT_STARTED = "workout_started"
    WORKOUT_COMPLETED = "workout_completed"
    WORKOUT_ABANDONED = "workout_abandoned"

    # Progression events
    XP_EARNED = "xp_earned"
    LEVEL_UP = "level_up"
    STREAK_INCREMENTED = "streak_incremented"
    STREAK_RESET = "streak_reset"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"

    # Profile events
    PROFILE_CREATED = "profile_created"
    PROFILE_UPDATED = "profile_updated"
    GOALS_UPDATED = "goals_updated"
    PREFERENCES_UPDATED = "preferences_updated"

    # Metrics events
    WEIGHT_LOGGED = "weight_logged"
    BIOMARKER_UPLOADED = "biomarker_uploaded"
    METRIC_RECORDED = "metric_recorded"

    # Coach events
    COACH_MESSAGE_SENT = "coach_message_sent"
    COACH_INSIGHT_VIEWED = "coach_insight_viewed"

    # Content events
    RECIPE_SAVED = "recipe_saved"
    RECIPE_UNSAVED = "recipe_unsaved"

    # Social events
    FRIEND_REQUEST_SENT = "friend_request_sent"
    FRIEND_REQUEST_ACCEPTED = "friend_request_accepted"
    FRIEND_REQUEST_DECLINED = "friend_request_declined"
    FRIEND_REMOVED = "friend_removed"
    USER_BLOCKED = "user_blocked"
    USER_UNBLOCKED = "user_unblocked"
    FOLLOW_STARTED = "follow_started"
    FOLLOW_ENDED = "follow_ended"
    CHALLENGE_CREATED = "challenge_created"
    CHALLENGE_JOINED = "challenge_joined"
    CHALLENGE_LEFT = "challenge_left"
    CHALLENGE_COMPLETED = "challenge_completed"
    SHARE_CREATED = "share_created"


class EventSource(str, Enum):
    """Where the event originated from."""
    API = "api"
    MOBILE = "mobile"
    WEB = "web"
    SCHEDULED = "scheduled"
    SYSTEM = "system"


# Mapping of event types to categories
EVENT_CATEGORY_MAP: dict[EventType, EventCategory] = {
    # Auth
    EventType.IDENTITY_CREATED: EventCategory.AUTH,
    EventType.LOGIN: EventCategory.AUTH,
    EventType.LOGOUT: EventCategory.AUTH,
    # Fasting
    EventType.FAST_STARTED: EventCategory.FASTING,
    EventType.FAST_PAUSED: EventCategory.FASTING,
    EventType.FAST_RESUMED: EventCategory.FASTING,
    EventType.FAST_COMPLETED: EventCategory.FASTING,
    EventType.FAST_ABANDONED: EventCategory.FASTING,
    EventType.FAST_EXTENDED: EventCategory.FASTING,
    # Workout
    EventType.WORKOUT_STARTED: EventCategory.WORKOUT,
    EventType.WORKOUT_COMPLETED: EventCategory.WORKOUT,
    EventType.WORKOUT_ABANDONED: EventCategory.WORKOUT,
    # Progression
    EventType.XP_EARNED: EventCategory.PROGRESSION,
    EventType.LEVEL_UP: EventCategory.PROGRESSION,
    EventType.STREAK_INCREMENTED: EventCategory.PROGRESSION,
    EventType.STREAK_RESET: EventCategory.PROGRESSION,
    EventType.ACHIEVEMENT_UNLOCKED: EventCategory.PROGRESSION,
    # Profile
    EventType.PROFILE_CREATED: EventCategory.PROFILE,
    EventType.PROFILE_UPDATED: EventCategory.PROFILE,
    EventType.GOALS_UPDATED: EventCategory.PROFILE,
    EventType.PREFERENCES_UPDATED: EventCategory.PROFILE,
    # Metrics
    EventType.WEIGHT_LOGGED: EventCategory.METRICS,
    EventType.BIOMARKER_UPLOADED: EventCategory.METRICS,
    EventType.METRIC_RECORDED: EventCategory.METRICS,
    # Coach
    EventType.COACH_MESSAGE_SENT: EventCategory.COACH,
    EventType.COACH_INSIGHT_VIEWED: EventCategory.COACH,
    # Content
    EventType.RECIPE_SAVED: EventCategory.CONTENT,
    EventType.RECIPE_UNSAVED: EventCategory.CONTENT,
    # Social
    EventType.FRIEND_REQUEST_SENT: EventCategory.SOCIAL,
    EventType.FRIEND_REQUEST_ACCEPTED: EventCategory.SOCIAL,
    EventType.FRIEND_REQUEST_DECLINED: EventCategory.SOCIAL,
    EventType.FRIEND_REMOVED: EventCategory.SOCIAL,
    EventType.USER_BLOCKED: EventCategory.SOCIAL,
    EventType.USER_UNBLOCKED: EventCategory.SOCIAL,
    EventType.FOLLOW_STARTED: EventCategory.SOCIAL,
    EventType.FOLLOW_ENDED: EventCategory.SOCIAL,
    EventType.CHALLENGE_CREATED: EventCategory.SOCIAL,
    EventType.CHALLENGE_JOINED: EventCategory.SOCIAL,
    EventType.CHALLENGE_LEFT: EventCategory.SOCIAL,
    EventType.CHALLENGE_COMPLETED: EventCategory.SOCIAL,
    EventType.SHARE_CREATED: EventCategory.SOCIAL,
}


def get_category_for_event(event_type: EventType) -> EventCategory:
    """Get the category for an event type."""
    return EVENT_CATEGORY_MAP.get(event_type, EventCategory.AUTH)


class ActivityEvent(BaseModel):
    """
    Core ACTIVITY_EVENT primitive.

    An immutable record of a point-in-time occurrence.
    Once created, events are never modified or deleted (except for GDPR).
    """
    id: str = Field(..., description="Opaque event reference")
    identity_id: str = Field(..., description="Who performed the action")
    event_type: EventType = Field(..., description="What happened")
    category: EventCategory = Field(..., description="Event category for filtering")
    timestamp: datetime = Field(..., description="When it happened")

    # Optional context
    related_id: str | None = Field(None, description="Related resource ID (e.g., window_id, workout_id)")
    related_type: str | None = Field(None, description="Type of related resource (e.g., 'time_window', 'workout')")
    source: EventSource = Field(default=EventSource.API, description="Where the event originated")
    metadata: dict = Field(default_factory=dict, description="Additional context as JSON")
    description: str | None = Field(None, description="Human-readable description")

    # Timestamp (no updated_at - events are immutable)
    created_at: datetime


class ActivityEventSummary(BaseModel):
    """Summary of activity events for a time period."""
    total_events: int
    events_by_category: dict[str, int]
    events_by_type: dict[str, int]
    period_start: datetime
    period_end: datetime


class EventFeedItem(BaseModel):
    """Event formatted for activity feed display."""
    id: str
    event_type: EventType
    category: EventCategory
    timestamp: datetime
    title: str
    description: str | None
    icon: str  # Icon identifier for mobile
    metadata: dict


# Human-readable titles for event types
EVENT_TITLES: dict[EventType, str] = {
    EventType.IDENTITY_CREATED: "Account Created",
    EventType.LOGIN: "Logged In",
    EventType.LOGOUT: "Logged Out",
    EventType.FAST_STARTED: "Fast Started",
    EventType.FAST_PAUSED: "Fast Paused",
    EventType.FAST_RESUMED: "Fast Resumed",
    EventType.FAST_COMPLETED: "Fast Completed",
    EventType.FAST_ABANDONED: "Fast Ended Early",
    EventType.FAST_EXTENDED: "Fast Extended",
    EventType.WORKOUT_STARTED: "Workout Started",
    EventType.WORKOUT_COMPLETED: "Workout Completed",
    EventType.WORKOUT_ABANDONED: "Workout Ended Early",
    EventType.XP_EARNED: "XP Earned",
    EventType.LEVEL_UP: "Level Up!",
    EventType.STREAK_INCREMENTED: "Streak Extended",
    EventType.STREAK_RESET: "Streak Reset",
    EventType.ACHIEVEMENT_UNLOCKED: "Achievement Unlocked",
    EventType.PROFILE_CREATED: "Profile Created",
    EventType.PROFILE_UPDATED: "Profile Updated",
    EventType.GOALS_UPDATED: "Goals Updated",
    EventType.PREFERENCES_UPDATED: "Preferences Updated",
    EventType.WEIGHT_LOGGED: "Weight Logged",
    EventType.BIOMARKER_UPLOADED: "Bloodwork Uploaded",
    EventType.METRIC_RECORDED: "Metric Recorded",
    EventType.COACH_MESSAGE_SENT: "Coach Message",
    EventType.COACH_INSIGHT_VIEWED: "Insight Viewed",
    EventType.RECIPE_SAVED: "Recipe Saved",
    EventType.RECIPE_UNSAVED: "Recipe Removed",
    EventType.FRIEND_REQUEST_SENT: "Friend Request Sent",
    EventType.FRIEND_REQUEST_ACCEPTED: "Friend Request Accepted",
    EventType.FRIEND_REQUEST_DECLINED: "Friend Request Declined",
    EventType.FRIEND_REMOVED: "Friend Removed",
    EventType.USER_BLOCKED: "User Blocked",
    EventType.USER_UNBLOCKED: "User Unblocked",
    EventType.FOLLOW_STARTED: "Started Following",
    EventType.FOLLOW_ENDED: "Stopped Following",
    EventType.CHALLENGE_CREATED: "Challenge Created",
    EventType.CHALLENGE_JOINED: "Joined Challenge",
    EventType.CHALLENGE_LEFT: "Left Challenge",
    EventType.CHALLENGE_COMPLETED: "Challenge Completed!",
    EventType.SHARE_CREATED: "Progress Shared",
}

# Icon identifiers for mobile app
EVENT_ICONS: dict[EventType, str] = {
    EventType.IDENTITY_CREATED: "user-plus",
    EventType.LOGIN: "log-in",
    EventType.LOGOUT: "log-out",
    EventType.FAST_STARTED: "clock",
    EventType.FAST_PAUSED: "pause",
    EventType.FAST_RESUMED: "play",
    EventType.FAST_COMPLETED: "check-circle",
    EventType.FAST_ABANDONED: "x-circle",
    EventType.FAST_EXTENDED: "plus-circle",
    EventType.WORKOUT_STARTED: "activity",
    EventType.WORKOUT_COMPLETED: "award",
    EventType.WORKOUT_ABANDONED: "x-circle",
    EventType.XP_EARNED: "star",
    EventType.LEVEL_UP: "trending-up",
    EventType.STREAK_INCREMENTED: "flame",
    EventType.STREAK_RESET: "refresh-cw",
    EventType.ACHIEVEMENT_UNLOCKED: "trophy",
    EventType.PROFILE_CREATED: "user",
    EventType.PROFILE_UPDATED: "edit",
    EventType.GOALS_UPDATED: "target",
    EventType.PREFERENCES_UPDATED: "settings",
    EventType.WEIGHT_LOGGED: "scale",
    EventType.BIOMARKER_UPLOADED: "file-text",
    EventType.METRIC_RECORDED: "bar-chart",
    EventType.COACH_MESSAGE_SENT: "message-circle",
    EventType.COACH_INSIGHT_VIEWED: "lightbulb",
    EventType.RECIPE_SAVED: "bookmark",
    EventType.RECIPE_UNSAVED: "bookmark-minus",
    EventType.FRIEND_REQUEST_SENT: "user-plus",
    EventType.FRIEND_REQUEST_ACCEPTED: "users",
    EventType.FRIEND_REQUEST_DECLINED: "user-x",
    EventType.FRIEND_REMOVED: "user-minus",
    EventType.USER_BLOCKED: "shield-off",
    EventType.USER_UNBLOCKED: "shield",
    EventType.FOLLOW_STARTED: "eye",
    EventType.FOLLOW_ENDED: "eye-off",
    EventType.CHALLENGE_CREATED: "flag",
    EventType.CHALLENGE_JOINED: "users",
    EventType.CHALLENGE_LEFT: "log-out",
    EventType.CHALLENGE_COMPLETED: "trophy",
    EventType.SHARE_CREATED: "share-2",
}


# Request models
class RecordEventRequest(BaseModel):
    """Request to record a new event."""
    event_type: EventType
    related_id: str | None = None
    related_type: str | None = None
    source: EventSource = EventSource.API
    metadata: dict = Field(default_factory=dict)
    description: str | None = None
    timestamp: datetime | None = None  # Defaults to now


class GetEventsRequest(BaseModel):
    """Request to query events."""
    category: EventCategory | None = None
    event_types: list[EventType] | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    limit: int = 50
    offset: int = 0
