"""
EVENT_JOURNAL Module - API Routes

Endpoints for querying activity events and activity feed.
Recording events is typically done internally by other modules.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.event_journal.models import (
    ActivityEvent,
    ActivityEventSummary,
    EventFeedItem,
    EventType,
    EventCategory,
    RecordEventRequest,
)
from src.modules.event_journal.service import EventJournalService


router = APIRouter(tags=["events"])


def get_event_journal_service(db: AsyncSession = Depends(get_db)) -> EventJournalService:
    return EventJournalService(db)


# =========================================================================
# Activity Feed (Main user-facing endpoint)
# =========================================================================


@router.get("/feed", response_model=list[EventFeedItem])
async def get_activity_feed(
    identity_id: str,  # TODO: Extract from JWT
    category: EventCategory | None = Query(None, description="Filter by category"),
    limit: int = Query(20, le=100, description="Maximum number of events"),
    before: datetime | None = Query(None, description="Get events before this timestamp (for pagination)"),
    service: EventJournalService = Depends(get_event_journal_service),
) -> list[EventFeedItem]:
    """
    Get user's activity feed for display.

    Returns events formatted with human-readable titles, icons,
    and descriptions for mobile/web display.

    Use `before` parameter for infinite scroll pagination.
    Use `category` to filter by event category (fasting, workout, progression, metrics, content).
    """
    return await service.get_activity_feed(
        identity_id=identity_id,
        category=category,
        limit=limit,
        before=before,
    )


# =========================================================================
# Query Events
# =========================================================================


@router.get("", response_model=list[ActivityEvent])
async def get_events(
    identity_id: str,  # TODO: Extract from JWT
    category: EventCategory | None = Query(None, description="Filter by category"),
    event_type: EventType | None = Query(None, description="Filter by event type"),
    start_time: datetime | None = Query(None, description="Filter from this time"),
    end_time: datetime | None = Query(None, description="Filter until this time"),
    limit: int = Query(50, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    service: EventJournalService = Depends(get_event_journal_service),
) -> list[ActivityEvent]:
    """
    Query events with optional filters.

    Returns raw ActivityEvent objects (for data export, analytics).
    For display purposes, use /feed endpoint instead.
    """
    event_types = [event_type] if event_type else None
    return await service.get_events(
        identity_id=identity_id,
        category=category,
        event_types=event_types,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
        offset=offset,
    )


@router.get("/by-related", response_model=list[ActivityEvent])
async def get_events_by_related(
    related_id: str = Query(..., description="Related resource ID"),
    related_type: str | None = Query(None, description="Related resource type"),
    service: EventJournalService = Depends(get_event_journal_service),
) -> list[ActivityEvent]:
    """
    Get all events related to a specific resource.

    Useful for getting event history for a fasting window,
    workout session, or other trackable resource.
    """
    return await service.get_events_by_related(
        related_id=related_id,
        related_type=related_type,
    )


@router.get("/summary", response_model=ActivityEventSummary)
async def get_event_summary(
    identity_id: str,  # TODO: Extract from JWT
    start_time: datetime = Query(..., description="Period start"),
    end_time: datetime = Query(..., description="Period end"),
    service: EventJournalService = Depends(get_event_journal_service),
) -> ActivityEventSummary:
    """
    Get summary statistics for events in a time period.

    Returns counts by category and event type.
    Useful for weekly/monthly activity summaries.
    """
    return await service.get_event_summary(
        identity_id=identity_id,
        start_time=start_time,
        end_time=end_time,
    )


@router.get("/count", response_model=dict)
async def get_event_count(
    identity_id: str,  # TODO: Extract from JWT
    event_type: EventType = Query(..., description="Event type to count"),
    start_time: datetime | None = Query(None, description="Period start"),
    end_time: datetime | None = Query(None, description="Period end"),
    service: EventJournalService = Depends(get_event_journal_service),
) -> dict:
    """
    Count events of a specific type.

    Useful for quick stats like "5 fasts completed this week".
    """
    count = await service.get_event_counts(
        identity_id=identity_id,
        event_type=event_type,
        start_time=start_time,
        end_time=end_time,
    )
    return {"event_type": event_type.value, "count": count}


@router.get("/{event_id}", response_model=ActivityEvent)
async def get_event(
    event_id: str,
    service: EventJournalService = Depends(get_event_journal_service),
) -> ActivityEvent:
    """Get a specific event by ID."""
    event = await service.get_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    return event


# =========================================================================
# Record Event (Internal use - typically called by other modules)
# =========================================================================


@router.post("", response_model=ActivityEvent, status_code=status.HTTP_201_CREATED)
async def record_event(
    identity_id: str,  # TODO: Extract from JWT
    request: RecordEventRequest,
    service: EventJournalService = Depends(get_event_journal_service),
) -> ActivityEvent:
    """
    Record a new activity event.

    This endpoint is typically used internally by other modules.
    Events are immutable once created.
    """
    return await service.record_event(
        identity_id=identity_id,
        event_type=request.event_type,
        related_id=request.related_id,
        related_type=request.related_type,
        source=request.source,
        metadata=request.metadata,
        description=request.description,
        timestamp=request.timestamp,
    )


# =========================================================================
# GDPR Endpoints (Protected - admin only in production)
# =========================================================================


@router.get("/export/all", response_model=list[ActivityEvent])
async def export_events(
    identity_id: str,  # TODO: Extract from JWT + verify ownership
    service: EventJournalService = Depends(get_event_journal_service),
) -> list[ActivityEvent]:
    """
    Export all events for GDPR data portability.

    Returns complete event history for the identity.
    """
    return await service.export_events(identity_id)


@router.delete("/gdpr/delete", status_code=status.HTTP_200_OK)
async def delete_all_events(
    identity_id: str,  # TODO: Extract from JWT + verify ownership
    service: EventJournalService = Depends(get_event_journal_service),
) -> dict:
    """
    Delete all events for GDPR erasure.

    WARNING: This permanently deletes all event history.
    """
    count = await service.delete_events(identity_id)
    return {"deleted": count, "identity_id": identity_id}


@router.post("/gdpr/anonymize", status_code=status.HTTP_200_OK)
async def anonymize_events(
    identity_id: str,  # TODO: Extract from JWT + verify ownership
    service: EventJournalService = Depends(get_event_journal_service),
) -> dict:
    """
    Anonymize events for GDPR (alternative to deletion).

    Replaces identity with a hash and clears PII from metadata.
    Preserves event data for aggregate analytics.
    """
    count = await service.anonymize_events(identity_id)
    return {"anonymized": count, "identity_id": identity_id}
