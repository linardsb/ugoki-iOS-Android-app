"""SQLAlchemy ORM models for NOTIFICATION module."""

from datetime import datetime, time

from sqlalchemy import (
    String, Integer, Text, Boolean, DateTime, Time,
    Enum as SQLEnum, JSON, Index
)
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin
from src.modules.notification.models import (
    NotificationType, NotificationCategory, NotificationStatus, NotificationPriority
)


class NotificationORM(Base, TimestampMixin):
    """Database model for notifications."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    notification_type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType), nullable=False
    )
    category: Mapped[NotificationCategory] = mapped_column(
        SQLEnum(NotificationCategory), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[str | None] = mapped_column(JSON, nullable=True)
    priority: Mapped[NotificationPriority] = mapped_column(
        SQLEnum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False
    )
    status: Mapped[NotificationStatus] = mapped_column(
        SQLEnum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False, index=True
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_notifications_identity_status", "identity_id", "status"),
        Index("ix_notifications_identity_created", "identity_id", "created_at"),
        Index("ix_notifications_scheduled", "scheduled_for", "status"),
    )


class NotificationPreferencesORM(Base, TimestampMixin):
    """Database model for notification preferences."""

    __tablename__ = "notification_preferences"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Category preferences
    fasting_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    workout_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    streak_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    achievement_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    motivational_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Quiet hours
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    quiet_hours_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    quiet_hours_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    
    # Daily motivation time
    daily_motivation_time: Mapped[time | None] = mapped_column(Time, nullable=True)


class DeviceTokenORM(Base, TimestampMixin):
    """Database model for push notification device tokens."""

    __tablename__ = "device_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # ios, android, web
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_device_tokens_identity_active", "identity_id", "is_active"),
        Index("ix_device_tokens_token", "token", unique=True),
    )


class ScheduledNotificationORM(Base, TimestampMixin):
    """Database model for scheduled/recurring notifications."""

    __tablename__ = "scheduled_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    category: Mapped[NotificationCategory] = mapped_column(
        SQLEnum(NotificationCategory), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    schedule_type: Mapped[str] = mapped_column(String(20), nullable=False)  # once, daily, weekly
    schedule_time: Mapped[time] = mapped_column(Time, nullable=False)
    schedule_days: Mapped[str | None] = mapped_column(JSON, nullable=True)  # [0,1,2...] for weekly
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    next_trigger: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_scheduled_notifications_next", "next_trigger", "is_active"),
    )
