"""Service implementation for NOTIFICATION module."""

import uuid
from datetime import datetime, UTC, time
from collections import Counter

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.notification.interface import NotificationInterface
from src.modules.notification.models import (
    Notification,
    NotificationPreferences,
    ScheduledNotification,
    DeviceToken,
    NotificationCategory,
    NotificationType,
    NotificationStatus,
    NotificationPriority,
    SendNotificationRequest,
    NotificationStats,
)
from src.modules.notification.orm import (
    NotificationORM,
    NotificationPreferencesORM,
    DeviceTokenORM,
    ScheduledNotificationORM,
)


def _ensure_tz(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class NotificationService(NotificationInterface):
    """Implementation of NOTIFICATION interface."""

    def __init__(self, db: AsyncSession):
        self._db = db

    # =========================================================================
    # Conversion helpers
    # =========================================================================

    def _notification_to_model(self, orm: NotificationORM) -> Notification:
        return Notification(
            id=orm.id,
            identity_id=orm.identity_id,
            notification_type=orm.notification_type,
            category=orm.category,
            title=orm.title,
            body=orm.body,
            data=orm.data,
            priority=orm.priority,
            status=orm.status,
            scheduled_for=_ensure_tz(orm.scheduled_for),
            sent_at=_ensure_tz(orm.sent_at),
            read_at=_ensure_tz(orm.read_at),
            created_at=_ensure_tz(orm.created_at),
        )

    def _preferences_to_model(self, orm: NotificationPreferencesORM) -> NotificationPreferences:
        return NotificationPreferences(
            identity_id=orm.identity_id,
            push_enabled=orm.push_enabled,
            email_enabled=orm.email_enabled,
            in_app_enabled=orm.in_app_enabled,
            fasting_notifications=orm.fasting_notifications,
            workout_notifications=orm.workout_notifications,
            streak_notifications=orm.streak_notifications,
            achievement_notifications=orm.achievement_notifications,
            motivational_notifications=orm.motivational_notifications,
            quiet_hours_enabled=orm.quiet_hours_enabled,
            quiet_hours_start=orm.quiet_hours_start,
            quiet_hours_end=orm.quiet_hours_end,
            daily_motivation_time=orm.daily_motivation_time,
        )

    def _device_to_model(self, orm: DeviceTokenORM) -> DeviceToken:
        return DeviceToken(
            id=orm.id,
            identity_id=orm.identity_id,
            token=orm.token,
            platform=orm.platform,
            is_active=orm.is_active,
            created_at=_ensure_tz(orm.created_at),
            last_used_at=_ensure_tz(orm.last_used_at),
        )

    def _scheduled_to_model(self, orm: ScheduledNotificationORM) -> ScheduledNotification:
        return ScheduledNotification(
            id=orm.id,
            identity_id=orm.identity_id,
            category=orm.category,
            title=orm.title,
            body=orm.body,
            schedule_type=orm.schedule_type,
            schedule_time=orm.schedule_time,
            schedule_days=orm.schedule_days,
            is_active=orm.is_active,
            next_trigger=_ensure_tz(orm.next_trigger),
            created_at=_ensure_tz(orm.created_at),
        )

    # =========================================================================
    # Helper methods
    # =========================================================================

    async def _get_or_create_preferences(self, identity_id: str) -> NotificationPreferencesORM:
        """Get or create notification preferences for a user."""
        result = await self._db.execute(
            select(NotificationPreferencesORM)
            .where(NotificationPreferencesORM.identity_id == identity_id)
        )
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            prefs = NotificationPreferencesORM(identity_id=identity_id)
            self._db.add(prefs)
            await self._db.commit()
            await self._db.refresh(prefs)
        
        return prefs

    def _is_category_enabled(self, prefs: NotificationPreferencesORM, category: NotificationCategory) -> bool:
        """Check if a notification category is enabled."""
        category_map = {
            NotificationCategory.FASTING: prefs.fasting_notifications,
            NotificationCategory.WORKOUT: prefs.workout_notifications,
            NotificationCategory.STREAK: prefs.streak_notifications,
            NotificationCategory.ACHIEVEMENT: prefs.achievement_notifications,
            NotificationCategory.LEVEL_UP: prefs.achievement_notifications,
            NotificationCategory.MOTIVATIONAL: prefs.motivational_notifications,
            NotificationCategory.REMINDER: True,
            NotificationCategory.SYSTEM: True,
        }
        return category_map.get(category, True)

    def _is_quiet_hours(self, prefs: NotificationPreferencesORM) -> bool:
        """Check if we're currently in quiet hours."""
        if not prefs.quiet_hours_enabled:
            return False
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        
        now = datetime.now(UTC).time()
        start = prefs.quiet_hours_start
        end = prefs.quiet_hours_end
        
        if start <= end:
            return start <= now <= end
        else:
            # Quiet hours span midnight
            return now >= start or now <= end

    async def _deliver_notification(self, notification: NotificationORM, prefs: NotificationPreferencesORM) -> None:
        """Actually deliver the notification (push, email, etc.)."""
        # In production, this would integrate with:
        # - Expo Push Notifications for mobile
        # - Resend/SendGrid for email
        # - WebSocket for in-app
        
        # For now, just mark as sent
        notification.status = NotificationStatus.SENT
        notification.sent_at = datetime.now(UTC)
        
        # TODO: Implement actual delivery
        # if notification.notification_type == NotificationType.PUSH and prefs.push_enabled:
        #     await self._send_push(notification)
        # if notification.notification_type == NotificationType.EMAIL and prefs.email_enabled:
        #     await self._send_email(notification)

    # =========================================================================
    # Sending Notifications
    # =========================================================================

    async def send(
        self,
        identity_id: str,
        request: SendNotificationRequest,
    ) -> Notification:
        """Send a notification to a user."""
        prefs = await self._get_or_create_preferences(identity_id)
        
        # Check if category is enabled
        if not self._is_category_enabled(prefs, request.category):
            # Create but don't send
            notification = NotificationORM(
                id=str(uuid.uuid4()),
                identity_id=identity_id,
                notification_type=request.notification_type,
                category=request.category,
                title=request.title,
                body=request.body,
                data=request.data,
                priority=request.priority,
                status=NotificationStatus.FAILED,
                scheduled_for=request.schedule_for,
            )
            self._db.add(notification)
            await self._db.commit()
            await self._db.refresh(notification)
            return self._notification_to_model(notification)
        
        # Create notification
        notification = NotificationORM(
            id=str(uuid.uuid4()),
            identity_id=identity_id,
            notification_type=request.notification_type,
            category=request.category,
            title=request.title,
            body=request.body,
            data=request.data,
            priority=request.priority,
            status=NotificationStatus.PENDING,
            scheduled_for=request.schedule_for,
        )
        self._db.add(notification)
        
        # Send immediately if not scheduled and not in quiet hours
        if not request.schedule_for:
            if self._is_quiet_hours(prefs) and request.priority != NotificationPriority.URGENT:
                notification.status = NotificationStatus.PENDING
                # Would schedule for after quiet hours
            else:
                await self._deliver_notification(notification, prefs)
        
        await self._db.commit()
        await self._db.refresh(notification)
        
        return self._notification_to_model(notification)

    async def send_bulk(
        self,
        identity_ids: list[str],
        request: SendNotificationRequest,
    ) -> list[Notification]:
        """Send the same notification to multiple users."""
        notifications = []
        for identity_id in identity_ids:
            notification = await self.send(identity_id, request)
            notifications.append(notification)
        return notifications

    # =========================================================================
    # Notification History
    # =========================================================================

    async def get_notifications(
        self,
        identity_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        """Get user's notification history."""
        query = select(NotificationORM).where(
            NotificationORM.identity_id == identity_id,
            NotificationORM.status.in_([NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.READ]),
        )
        
        if unread_only:
            query = query.where(NotificationORM.read_at.is_(None))
        
        query = query.order_by(NotificationORM.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await self._db.execute(query)
        return [self._notification_to_model(orm) for orm in result.scalars().all()]

    async def mark_as_read(
        self,
        notification_id: str,
    ) -> Notification:
        """Mark a notification as read."""
        result = await self._db.execute(
            select(NotificationORM).where(NotificationORM.id == notification_id)
        )
        notification = result.scalar_one_or_none()
        if not notification:
            raise ValueError(f"Notification {notification_id} not found")
        
        notification.status = NotificationStatus.READ
        notification.read_at = datetime.now(UTC)
        
        await self._db.commit()
        await self._db.refresh(notification)
        
        return self._notification_to_model(notification)

    async def mark_all_as_read(
        self,
        identity_id: str,
    ) -> int:
        """Mark all notifications as read."""
        result = await self._db.execute(
            update(NotificationORM)
            .where(
                NotificationORM.identity_id == identity_id,
                NotificationORM.read_at.is_(None),
            )
            .values(status=NotificationStatus.READ, read_at=datetime.now(UTC))
        )
        await self._db.commit()
        return result.rowcount

    async def get_unread_count(
        self,
        identity_id: str,
    ) -> int:
        """Get count of unread notifications."""
        result = await self._db.execute(
            select(func.count(NotificationORM.id))
            .where(
                NotificationORM.identity_id == identity_id,
                NotificationORM.status.in_([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
                NotificationORM.read_at.is_(None),
            )
        )
        return result.scalar() or 0

    # =========================================================================
    # Device Tokens
    # =========================================================================

    async def register_device(
        self,
        identity_id: str,
        token: str,
        platform: str,
    ) -> DeviceToken:
        """Register a device for push notifications."""
        # Check if token already exists
        result = await self._db.execute(
            select(DeviceTokenORM).where(DeviceTokenORM.token == token)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing token
            existing.identity_id = identity_id
            existing.platform = platform
            existing.is_active = True
            existing.last_used_at = datetime.now(UTC)
            await self._db.commit()
            await self._db.refresh(existing)
            return self._device_to_model(existing)
        
        # Create new token
        device = DeviceTokenORM(
            id=str(uuid.uuid4()),
            identity_id=identity_id,
            token=token,
            platform=platform,
            is_active=True,
        )
        self._db.add(device)
        await self._db.commit()
        await self._db.refresh(device)
        
        return self._device_to_model(device)

    async def unregister_device(
        self,
        identity_id: str,
        token: str,
    ) -> bool:
        """Unregister a device token."""
        result = await self._db.execute(
            select(DeviceTokenORM).where(
                DeviceTokenORM.identity_id == identity_id,
                DeviceTokenORM.token == token,
            )
        )
        device = result.scalar_one_or_none()
        
        if device:
            device.is_active = False
            await self._db.commit()
            return True
        return False

    async def get_devices(
        self,
        identity_id: str,
    ) -> list[DeviceToken]:
        """Get all registered devices for a user."""
        result = await self._db.execute(
            select(DeviceTokenORM).where(
                DeviceTokenORM.identity_id == identity_id,
                DeviceTokenORM.is_active == True,
            )
        )
        return [self._device_to_model(orm) for orm in result.scalars().all()]

    # =========================================================================
    # Preferences
    # =========================================================================

    async def get_preferences(
        self,
        identity_id: str,
    ) -> NotificationPreferences:
        """Get user's notification preferences."""
        prefs = await self._get_or_create_preferences(identity_id)
        return self._preferences_to_model(prefs)

    async def update_preferences(
        self,
        identity_id: str,
        **updates,
    ) -> NotificationPreferences:
        """Update notification preferences."""
        prefs = await self._get_or_create_preferences(identity_id)
        
        for key, value in updates.items():
            if value is not None and hasattr(prefs, key):
                setattr(prefs, key, value)
        
        await self._db.commit()
        await self._db.refresh(prefs)
        
        return self._preferences_to_model(prefs)

    # =========================================================================
    # Scheduled Notifications
    # =========================================================================

    async def schedule_notification(
        self,
        identity_id: str,
        notification: ScheduledNotification,
    ) -> ScheduledNotification:
        """Create a scheduled/recurring notification."""
        scheduled = ScheduledNotificationORM(
            id=str(uuid.uuid4()),
            identity_id=identity_id,
            category=notification.category,
            title=notification.title,
            body=notification.body,
            schedule_type=notification.schedule_type,
            schedule_time=notification.schedule_time,
            schedule_days=notification.schedule_days,
            is_active=True,
            next_trigger=notification.next_trigger,
        )
        self._db.add(scheduled)
        await self._db.commit()
        await self._db.refresh(scheduled)
        
        return self._scheduled_to_model(scheduled)

    async def get_scheduled(
        self,
        identity_id: str,
    ) -> list[ScheduledNotification]:
        """Get user's scheduled notifications."""
        result = await self._db.execute(
            select(ScheduledNotificationORM).where(
                ScheduledNotificationORM.identity_id == identity_id,
                ScheduledNotificationORM.is_active == True,
            )
        )
        return [self._scheduled_to_model(orm) for orm in result.scalars().all()]

    async def cancel_scheduled(
        self,
        schedule_id: str,
    ) -> bool:
        """Cancel a scheduled notification."""
        result = await self._db.execute(
            select(ScheduledNotificationORM).where(ScheduledNotificationORM.id == schedule_id)
        )
        scheduled = result.scalar_one_or_none()
        
        if scheduled:
            scheduled.is_active = False
            await self._db.commit()
            return True
        return False

    # =========================================================================
    # Stats
    # =========================================================================

    async def get_stats(
        self,
        identity_id: str,
    ) -> NotificationStats:
        """Get notification statistics for a user."""
        # Total sent
        result = await self._db.execute(
            select(func.count(NotificationORM.id))
            .where(
                NotificationORM.identity_id == identity_id,
                NotificationORM.status.in_([NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.READ]),
            )
        )
        total_sent = result.scalar() or 0
        
        # Total read
        result = await self._db.execute(
            select(func.count(NotificationORM.id))
            .where(
                NotificationORM.identity_id == identity_id,
                NotificationORM.status == NotificationStatus.READ,
            )
        )
        total_read = result.scalar() or 0
        
        # By category
        result = await self._db.execute(
            select(NotificationORM.category, func.count(NotificationORM.id))
            .where(NotificationORM.identity_id == identity_id)
            .group_by(NotificationORM.category)
        )
        by_category = {str(row[0].value): row[1] for row in result.all()}
        
        read_rate = (total_read / total_sent * 100) if total_sent > 0 else 0.0
        
        return NotificationStats(
            total_sent=total_sent,
            total_read=total_read,
            read_rate=round(read_rate, 1),
            by_category=by_category,
        )

    # =========================================================================
    # Triggers
    # =========================================================================

    async def notify_fast_reminder(
        self,
        identity_id: str,
        hours_remaining: float,
    ) -> Notification | None:
        """Send fasting reminder notification."""
        return await self.send(
            identity_id,
            SendNotificationRequest(
                category=NotificationCategory.FASTING,
                title="Fasting Update",
                body=f"Keep going! Only {hours_remaining:.1f} hours left in your fast.",
                priority=NotificationPriority.NORMAL,
            ),
        )

    async def notify_fast_complete(
        self,
        identity_id: str,
        duration_hours: float,
    ) -> Notification | None:
        """Send fast completion notification."""
        return await self.send(
            identity_id,
            SendNotificationRequest(
                category=NotificationCategory.FASTING,
                title="Fast Complete! 🎉",
                body=f"Congratulations! You completed a {duration_hours:.0f}-hour fast!",
                priority=NotificationPriority.HIGH,
            ),
        )

    async def notify_streak_milestone(
        self,
        identity_id: str,
        streak_type: str,
        days: int,
    ) -> Notification | None:
        """Send streak milestone notification."""
        return await self.send(
            identity_id,
            SendNotificationRequest(
                category=NotificationCategory.STREAK,
                title=f"{days}-Day Streak! 🔥",
                body=f"Amazing! You've hit a {days}-day {streak_type} streak!",
                priority=NotificationPriority.HIGH,
                data={"streak_type": streak_type, "days": days},
            ),
        )

    async def notify_achievement_unlocked(
        self,
        identity_id: str,
        achievement_name: str,
        xp_earned: int,
    ) -> Notification | None:
        """Send achievement unlocked notification."""
        return await self.send(
            identity_id,
            SendNotificationRequest(
                category=NotificationCategory.ACHIEVEMENT,
                title="Achievement Unlocked! 🏆",
                body=f"You earned '{achievement_name}' (+{xp_earned} XP)",
                priority=NotificationPriority.HIGH,
                data={"achievement": achievement_name, "xp": xp_earned},
            ),
        )

    async def notify_level_up(
        self,
        identity_id: str,
        new_level: int,
        title: str,
    ) -> Notification | None:
        """Send level up notification."""
        return await self.send(
            identity_id,
            SendNotificationRequest(
                category=NotificationCategory.LEVEL_UP,
                title="Level Up! ⬆️",
                body=f"You reached Level {new_level}: {title}!",
                priority=NotificationPriority.HIGH,
                data={"level": new_level, "title": title},
            ),
        )
