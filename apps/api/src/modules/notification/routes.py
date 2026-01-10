"""FastAPI routes for NOTIFICATION module."""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.core.auth import get_current_identity
from src.modules.notification.models import (
    Notification,
    NotificationPreferences,
    DeviceToken,
    NotificationStats,
    SendNotificationRequest,
    RegisterDeviceRequest,
    UpdatePreferencesRequest,
)
from src.modules.notification.service import NotificationService

router = APIRouter(tags=["notifications"])


def get_notification_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


# =========================================================================
# Notifications
# =========================================================================

@router.post("/send", response_model=Notification, status_code=status.HTTP_201_CREATED)
async def send_notification(
    request: SendNotificationRequest,
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> Notification:
    """
    Send a notification to a user.
    
    Respects user preferences and quiet hours.
    Set schedule_for to delay delivery.
    """
    return await service.send(identity_id, request)


@router.get("", response_model=list[Notification])
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> list[Notification]:
    """Get notification history."""
    return await service.get_notifications(identity_id, unread_only, limit, offset)


@router.get("/unread-count", response_model=int)
async def get_unread_count(
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> int:
    """Get count of unread notifications."""
    return await service.get_unread_count(identity_id)


@router.post("/{notification_id}/read", response_model=Notification)
async def mark_as_read(
    notification_id: str,
    service: NotificationService = Depends(get_notification_service),
) -> Notification:
    """Mark a notification as read."""
    try:
        return await service.mark_as_read(notification_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/read-all", response_model=dict)
async def mark_all_as_read(
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> dict:
    """Mark all notifications as read."""
    count = await service.mark_all_as_read(identity_id)
    return {"marked_read": count}


# =========================================================================
# Device Tokens
# =========================================================================

@router.post("/devices", response_model=DeviceToken, status_code=status.HTTP_201_CREATED)
async def register_device(
    request: RegisterDeviceRequest,
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> DeviceToken:
    """
    Register a device for push notifications.
    
    Platforms: ios, android, web
    """
    return await service.register_device(identity_id, request.token, request.platform)


@router.delete("/devices/{token}")
async def unregister_device(
    token: str,
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> dict:
    """Unregister a device token."""
    success = await service.unregister_device(identity_id, token)
    if not success:
        raise HTTPException(status_code=404, detail="Device token not found")
    return {"status": "ok"}


@router.get("/devices", response_model=list[DeviceToken])
async def get_devices(
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> list[DeviceToken]:
    """Get all registered devices for the user."""
    return await service.get_devices(identity_id)


# =========================================================================
# Preferences
# =========================================================================

@router.get("/preferences", response_model=NotificationPreferences)
async def get_preferences(
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationPreferences:
    """Get notification preferences."""
    return await service.get_preferences(identity_id)


@router.patch("/preferences", response_model=NotificationPreferences)
async def update_preferences(
    request: UpdatePreferencesRequest,
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationPreferences:
    """
    Update notification preferences.
    
    Only provided fields will be updated.
    """
    updates = request.model_dump(exclude_unset=True)
    return await service.update_preferences(identity_id, **updates)


# =========================================================================
# Stats
# =========================================================================

@router.get("/stats", response_model=NotificationStats)
async def get_stats(
    identity_id: str = Depends(get_current_identity),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationStats:
    """Get notification statistics."""
    return await service.get_stats(identity_id)
