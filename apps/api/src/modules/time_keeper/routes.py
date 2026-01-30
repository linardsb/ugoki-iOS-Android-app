from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.core.auth import get_current_identity, verify_resource_ownership
from src.modules.time_keeper.models import (
    TimeWindow,
    WindowType,
    WindowState,
    OpenWindowRequest,
    CloseWindowRequest,
    ExtendWindowRequest,
)
from src.modules.time_keeper.service import TimeKeeperService
from src.modules.event_journal.service import EventJournalService
from src.modules.progression.service import ProgressionService
from src.modules.progression.models import StreakType
from src.modules.social.service import SocialService
from src.modules.social.models import FeedActivityType

router = APIRouter(tags=["time_keeper"])


def get_event_journal_service(db: AsyncSession = Depends(get_db)) -> EventJournalService:
    return EventJournalService(db)


def get_progression_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> ProgressionService:
    return ProgressionService(db, event_journal=event_journal)


def get_social_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
    progression_service: ProgressionService = Depends(get_progression_service),
) -> SocialService:
    return SocialService(db, event_journal=event_journal, progression_service=progression_service)


def get_time_keeper_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
    social_service: SocialService = Depends(get_social_service),
) -> TimeKeeperService:
    return TimeKeeperService(db, event_journal=event_journal, social_service=social_service)


@router.post("/windows", response_model=TimeWindow, status_code=status.HTTP_201_CREATED)
async def open_window(
    request: OpenWindowRequest,
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> TimeWindow:
    """Open a new time window (fast, eating, workout, etc.)."""
    try:
        return await service.open_window(
            identity_id=identity_id,
            window_type=request.window_type,
            scheduled_end=request.scheduled_end,
            metadata=request.metadata,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/windows/{window_id}/close", response_model=TimeWindow)
async def close_window(
    window_id: str,
    request: CloseWindowRequest | None = None,
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service),
    progression: ProgressionService = Depends(get_progression_service),
    social: SocialService = Depends(get_social_service),
) -> TimeWindow:
    """Close an active window."""
    try:
        # Use defaults if no request body provided
        if request is None:
            request = CloseWindowRequest()

        # Get window info before closing (for identity_id and type)
        window_info = await service.get_window(window_id)
        if not window_info:
            raise ValueError("Window not found")

        # Verify ownership before allowing close
        verify_resource_ownership(window_info.identity_id, identity_id, "Window")

        # Close the window
        window = await service.close_window(
            window_id=window_id,
            end_state=request.end_state,
            metadata=request.metadata,
        )

        # Update streak if window was completed (not abandoned)
        if request.end_state == WindowState.COMPLETED:
            # Map window type to streak type
            streak_type_map = {
                WindowType.FAST: StreakType.FASTING,
                WindowType.WORKOUT: StreakType.WORKOUT,
            }
            streak_type = streak_type_map.get(window.window_type)
            if streak_type:
                await progression.record_activity(
                    identity_id=window.identity_id,
                    streak_type=streak_type,
                )

            # Update challenge progress for any active challenges
            await social.update_challenge_progress(window.identity_id)

            # Create feed item for friends' activity feed
            await _create_feed_item_for_window(social, window)

        return window
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/windows/{window_id}/extend", response_model=TimeWindow)
async def extend_window(
    window_id: str,
    request: ExtendWindowRequest,
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> TimeWindow:
    """Extend a window's scheduled end time."""
    try:
        # Verify ownership before allowing extend
        window = await service.get_window(window_id)
        if not window:
            raise ValueError("Window not found")
        verify_resource_ownership(window.identity_id, identity_id, "Window")

        return await service.extend_window(window_id, request.new_end)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/windows/active", response_model=TimeWindow | None)
async def get_active_window(
    window_type: WindowType | None = Query(None),
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> TimeWindow | None:
    """Get the currently active window."""
    return await service.get_active_window(identity_id, window_type)


@router.get("/windows/{window_id}", response_model=TimeWindow)
async def get_window(
    window_id: str,
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> TimeWindow:
    """Get a specific window by ID."""
    window = await service.get_window(window_id)
    if not window:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Window not found")
    # Verify ownership
    verify_resource_ownership(window.identity_id, identity_id, "Window")
    return window


@router.get("/windows", response_model=list[TimeWindow])
async def get_windows(
    window_type: WindowType | None = Query(None),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> list[TimeWindow]:
    """Get windows with optional filters."""
    return await service.get_windows(
        identity_id=identity_id,
        window_type=window_type,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
        offset=offset,
    )


@router.get("/windows/{window_id}/elapsed")
async def get_elapsed_time(
    window_id: str,
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> dict[str, int]:
    """Get elapsed time in seconds for a window."""
    try:
        elapsed = await service.get_elapsed_time(window_id)
        return {"elapsed_seconds": elapsed}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/windows/{window_id}/remaining")
async def get_remaining_time(
    window_id: str,
    service: TimeKeeperService = Depends(get_time_keeper_service),
) -> dict[str, int | None]:
    """Get remaining time in seconds until scheduled end."""
    try:
        remaining = await service.get_remaining_time(window_id)
        return {"remaining_seconds": remaining}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# =========================================================================
# Helpers
# =========================================================================

async def _create_feed_item_for_window(
    social: SocialService,
    window: TimeWindow,
) -> None:
    """Create a feed item when a window is completed."""
    try:
        # Calculate duration for subtitle
        duration_seconds = 0
        if window.end_time and window.start_time:
            duration_seconds = int((window.end_time - window.start_time).total_seconds())

        if window.window_type == WindowType.FAST:
            hours = duration_seconds // 3600
            minutes = (duration_seconds % 3600) // 60
            duration_str = f"{hours}h {minutes}m" if hours else f"{minutes}m"

            await social.create_feed_item(
                identity_id=window.identity_id,
                activity_type=FeedActivityType.FAST_COMPLETED,
                title="Completed a fast",
                subtitle=f"Duration: {duration_str}",
                metadata={
                    "window_id": window.id,
                    "duration_seconds": duration_seconds,
                    "duration_hours": round(duration_seconds / 3600, 2),
                },
            )

        elif window.window_type == WindowType.WORKOUT:
            minutes = duration_seconds // 60

            await social.create_feed_item(
                identity_id=window.identity_id,
                activity_type=FeedActivityType.WORKOUT_COMPLETED,
                title="Completed a workout",
                subtitle=f"Duration: {minutes} min",
                metadata={
                    "window_id": window.id,
                    "duration_seconds": duration_seconds,
                    "duration_minutes": minutes,
                },
            )
    except Exception:
        # Don't fail the main operation if feed item creation fails
        pass
