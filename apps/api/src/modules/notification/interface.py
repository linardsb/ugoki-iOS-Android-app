"""Abstract interface for NOTIFICATION module."""

from abc import ABC, abstractmethod
from datetime import datetime

from src.modules.notification.models import (
    Notification,
    NotificationPreferences,
    ScheduledNotification,
    DeviceToken,
    NotificationCategory,
    NotificationType,
    NotificationPriority,
    SendNotificationRequest,
    NotificationStats,
)


class NotificationInterface(ABC):
    """
    NOTIFICATION module interface.
    
    Handles push notifications, email, in-app notifications, and scheduling.
    """

    # =========================================================================
    # Sending Notifications
    # =========================================================================

    @abstractmethod
    async def send(
        self,
        identity_id: str,
        request: SendNotificationRequest,
    ) -> Notification:
        """
        Send a notification to a user.
        
        Respects user preferences and quiet hours.
        Can be scheduled for future delivery.
        """
        pass

    @abstractmethod
    async def send_bulk(
        self,
        identity_ids: list[str],
        request: SendNotificationRequest,
    ) -> list[Notification]:
        """Send the same notification to multiple users."""
        pass

    # =========================================================================
    # Notification History
    # =========================================================================

    @abstractmethod
    async def get_notifications(
        self,
        identity_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        """Get user's notification history."""
        pass

    @abstractmethod
    async def mark_as_read(
        self,
        notification_id: str,
    ) -> Notification:
        """Mark a notification as read."""
        pass

    @abstractmethod
    async def mark_all_as_read(
        self,
        identity_id: str,
    ) -> int:
        """Mark all notifications as read. Returns count."""
        pass

    @abstractmethod
    async def get_unread_count(
        self,
        identity_id: str,
    ) -> int:
        """Get count of unread notifications."""
        pass

    # =========================================================================
    # Device Tokens (Push Notifications)
    # =========================================================================

    @abstractmethod
    async def register_device(
        self,
        identity_id: str,
        token: str,
        platform: str,
    ) -> DeviceToken:
        """Register a device for push notifications."""
        pass

    @abstractmethod
    async def unregister_device(
        self,
        identity_id: str,
        token: str,
    ) -> bool:
        """Unregister a device token."""
        pass

    @abstractmethod
    async def get_devices(
        self,
        identity_id: str,
    ) -> list[DeviceToken]:
        """Get all registered devices for a user."""
        pass

    # =========================================================================
    # Preferences
    # =========================================================================

    @abstractmethod
    async def get_preferences(
        self,
        identity_id: str,
    ) -> NotificationPreferences:
        """Get user's notification preferences."""
        pass

    @abstractmethod
    async def update_preferences(
        self,
        identity_id: str,
        **updates,
    ) -> NotificationPreferences:
        """Update notification preferences."""
        pass

    # =========================================================================
    # Scheduled Notifications
    # =========================================================================

    @abstractmethod
    async def schedule_notification(
        self,
        identity_id: str,
        notification: ScheduledNotification,
    ) -> ScheduledNotification:
        """Create a scheduled/recurring notification."""
        pass

    @abstractmethod
    async def get_scheduled(
        self,
        identity_id: str,
    ) -> list[ScheduledNotification]:
        """Get user's scheduled notifications."""
        pass

    @abstractmethod
    async def cancel_scheduled(
        self,
        schedule_id: str,
    ) -> bool:
        """Cancel a scheduled notification."""
        pass

    # =========================================================================
    # Stats
    # =========================================================================

    @abstractmethod
    async def get_stats(
        self,
        identity_id: str,
    ) -> NotificationStats:
        """Get notification statistics for a user."""
        pass

    # =========================================================================
    # Triggers (Called by other modules)
    # =========================================================================

    @abstractmethod
    async def notify_fast_reminder(
        self,
        identity_id: str,
        hours_remaining: float,
    ) -> Notification | None:
        """Send fasting reminder notification."""
        pass

    @abstractmethod
    async def notify_fast_complete(
        self,
        identity_id: str,
        duration_hours: float,
    ) -> Notification | None:
        """Send fast completion notification."""
        pass

    @abstractmethod
    async def notify_streak_milestone(
        self,
        identity_id: str,
        streak_type: str,
        days: int,
    ) -> Notification | None:
        """Send streak milestone notification."""
        pass

    @abstractmethod
    async def notify_achievement_unlocked(
        self,
        identity_id: str,
        achievement_name: str,
        xp_earned: int,
    ) -> Notification | None:
        """Send achievement unlocked notification."""
        pass

    @abstractmethod
    async def notify_level_up(
        self,
        identity_id: str,
        new_level: int,
        title: str,
    ) -> Notification | None:
        """Send level up notification."""
        pass
