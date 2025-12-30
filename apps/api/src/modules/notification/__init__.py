"""NOTIFICATION module - Push notifications, email, and scheduling."""

from src.modules.notification.interface import NotificationInterface
from src.modules.notification.service import NotificationService

__all__ = ["NotificationInterface", "NotificationService"]
