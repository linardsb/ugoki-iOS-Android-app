"""Pydantic models for NOTIFICATION module."""

from datetime import datetime, time
from enum import Enum
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    """Types of notifications."""
    PUSH = "push"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationCategory(str, Enum):
    """Categories for notifications."""
    FASTING = "fasting"           # Fast reminders, completion
    WORKOUT = "workout"           # Workout reminders
    STREAK = "streak"             # Streak milestones, at risk
    ACHIEVEMENT = "achievement"   # Achievement unlocked
    LEVEL_UP = "level_up"         # Level up notification
    REMINDER = "reminder"         # General reminders
    MOTIVATIONAL = "motivational" # Daily motivation
    SYSTEM = "system"             # System notifications


class NotificationStatus(str, Enum):
    """Status of a notification."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class NotificationPriority(str, Enum):
    """Priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(BaseModel):
    """A notification record."""
    id: str
    identity_id: str
    notification_type: NotificationType
    category: NotificationCategory
    title: str
    body: str
    data: dict | None = None  # Extra payload data
    priority: NotificationPriority = NotificationPriority.NORMAL
    status: NotificationStatus = NotificationStatus.PENDING
    scheduled_for: datetime | None = None
    sent_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime


class NotificationPreferences(BaseModel):
    """User notification preferences."""
    identity_id: str
    push_enabled: bool = True
    email_enabled: bool = True
    in_app_enabled: bool = True
    
    # Category preferences
    fasting_notifications: bool = True
    workout_notifications: bool = True
    streak_notifications: bool = True
    achievement_notifications: bool = True
    motivational_notifications: bool = True
    
    # Quiet hours
    quiet_hours_enabled: bool = False
    quiet_hours_start: time | None = None  # e.g., 22:00
    quiet_hours_end: time | None = None    # e.g., 07:00
    
    # Frequency
    daily_motivation_time: time | None = None  # When to send daily motivation


class ScheduledNotification(BaseModel):
    """A scheduled notification template."""
    id: str
    identity_id: str
    category: NotificationCategory
    title: str
    body: str
    schedule_type: str  # "once", "daily", "weekly"
    schedule_time: time
    schedule_days: list[int] | None = None  # 0=Mon, 6=Sun for weekly
    is_active: bool = True
    next_trigger: datetime | None = None
    created_at: datetime


class DeviceToken(BaseModel):
    """Push notification device token."""
    id: str
    identity_id: str
    token: str
    platform: str  # "ios", "android", "web"
    is_active: bool = True
    created_at: datetime
    last_used_at: datetime | None = None


# Request/Response models
class SendNotificationRequest(BaseModel):
    """Request to send a notification."""
    notification_type: NotificationType = NotificationType.PUSH
    category: NotificationCategory
    title: str
    body: str
    data: dict | None = None
    priority: NotificationPriority = NotificationPriority.NORMAL
    schedule_for: datetime | None = None  # None = send immediately


class RegisterDeviceRequest(BaseModel):
    """Request to register a device for push notifications."""
    token: str
    platform: str = Field(..., pattern="^(ios|android|web)$")


class UpdatePreferencesRequest(BaseModel):
    """Request to update notification preferences."""
    push_enabled: bool | None = None
    email_enabled: bool | None = None
    in_app_enabled: bool | None = None
    fasting_notifications: bool | None = None
    workout_notifications: bool | None = None
    streak_notifications: bool | None = None
    achievement_notifications: bool | None = None
    motivational_notifications: bool | None = None
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    daily_motivation_time: time | None = None


class NotificationStats(BaseModel):
    """Notification statistics."""
    total_sent: int = 0
    total_read: int = 0
    read_rate: float = 0.0
    by_category: dict[str, int] = {}
