"""
EVENT_JOURNAL Module Interface

Purpose: Record and query immutable activity events for audit trails,
user activity feeds, analytics, and GDPR compliance.

This interface hides:
- Storage mechanism (SQL, time-series DB, etc.)
- Index strategies and query optimization
- Event aggregation algorithms
- Data retention policies

Consumers never know:
- Internal event ID format
- Database schema
- How summaries are calculated
- Storage partitioning strategies
"""

from abc import ABC, abstractmethod
from datetime import datetime

from src.modules.event_journal.models import (
    ActivityEvent,
    ActivityEventSummary,
    EventFeedItem,
    EventType,
    EventCategory,
    EventSource,
)


class EventJournalInterface(ABC):
    """
    EVENT_JOURNAL Module Interface

    Records immutable events for all significant user activities.
    Provides querying, analytics, and GDPR compliance operations.
    """

    # =========================================================================
    # Recording Events
    # =========================================================================

    @abstractmethod
    async def record_event(
        self,
        identity_id: str,
        event_type: EventType,
        related_id: str | None = None,
        related_type: str | None = None,
        source: EventSource = EventSource.API,
        metadata: dict | None = None,
        description: str | None = None,
        timestamp: datetime | None = None,
    ) -> ActivityEvent:
        """
        Record an immutable activity event.

        Args:
            identity_id: Opaque identity reference (who did it)
            event_type: Type of event (what happened)
            related_id: Optional reference to related resource (e.g., window_id)
            related_type: Type of related resource (e.g., 'time_window')
            source: Where the event originated (api, mobile, scheduled, system)
            metadata: Additional context as JSON
            description: Human-readable description
            timestamp: When it happened (defaults to now)

        Returns:
            The recorded ActivityEvent
        """
        pass

    # =========================================================================
    # Querying Events
    # =========================================================================

    @abstractmethod
    async def get_events(
        self,
        identity_id: str,
        category: EventCategory | None = None,
        event_types: list[EventType] | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ActivityEvent]:
        """
        Query events with filters.

        Args:
            identity_id: Opaque identity reference
            category: Filter by category (fasting, workout, etc.)
            event_types: Filter by specific event types
            start_time: Filter from this time (inclusive)
            end_time: Filter until this time (inclusive)
            limit: Maximum results (default 50)
            offset: Pagination offset

        Returns:
            List of ActivityEvents ordered by timestamp descending (newest first)
        """
        pass

    @abstractmethod
    async def get_event(self, event_id: str) -> ActivityEvent | None:
        """
        Get a single event by ID.

        Args:
            event_id: Opaque event reference

        Returns:
            ActivityEvent if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_events_by_related(
        self,
        related_id: str,
        related_type: str | None = None,
        identity_id: str | None = None,
    ) -> list[ActivityEvent]:
        """
        Get all events related to a specific resource.

        Useful for getting all events for a fasting window or workout session.

        Args:
            related_id: The related resource ID
            related_type: Optional filter by related type
            identity_id: Optional filter by identity (security)

        Returns:
            List of ActivityEvents ordered by timestamp
        """
        pass

    # =========================================================================
    # Activity Feed
    # =========================================================================

    @abstractmethod
    async def get_activity_feed(
        self,
        identity_id: str,
        limit: int = 20,
        before: datetime | None = None,
    ) -> list[EventFeedItem]:
        """
        Get user's activity feed for display.

        Returns events formatted for mobile/web display with
        human-readable titles and icon identifiers.

        Args:
            identity_id: Opaque identity reference
            limit: Maximum results (default 20)
            before: Get events before this timestamp (for pagination)

        Returns:
            List of EventFeedItems ready for display
        """
        pass

    # =========================================================================
    # Analytics
    # =========================================================================

    @abstractmethod
    async def get_event_summary(
        self,
        identity_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> ActivityEventSummary:
        """
        Get summary of events for a time period.

        Useful for analytics dashboards and AI coach context.

        Args:
            identity_id: Opaque identity reference
            start_time: Period start
            end_time: Period end

        Returns:
            ActivityEventSummary with counts by category and type
        """
        pass

    @abstractmethod
    async def get_event_counts(
        self,
        identity_id: str,
        event_type: EventType,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> int:
        """
        Count events of a specific type.

        Useful for quick stats (e.g., "completed 5 fasts this week").

        Args:
            identity_id: Opaque identity reference
            event_type: Type of event to count
            start_time: Optional period start
            end_time: Optional period end

        Returns:
            Number of matching events
        """
        pass

    # =========================================================================
    # GDPR Compliance
    # =========================================================================

    @abstractmethod
    async def export_events(
        self,
        identity_id: str,
    ) -> list[ActivityEvent]:
        """
        Export all events for GDPR data portability.

        Returns all events for the identity, ordered by timestamp.

        Args:
            identity_id: Opaque identity reference

        Returns:
            Complete list of all ActivityEvents
        """
        pass

    @abstractmethod
    async def delete_events(
        self,
        identity_id: str,
    ) -> int:
        """
        Delete all events for GDPR erasure.

        Permanently removes all events for the identity.

        Args:
            identity_id: Opaque identity reference

        Returns:
            Number of events deleted
        """
        pass

    @abstractmethod
    async def anonymize_events(
        self,
        identity_id: str,
    ) -> int:
        """
        Anonymize events for GDPR (alternative to deletion).

        Sets identity_id to a hash/null while preserving
        event data for aggregate analytics.

        Args:
            identity_id: Opaque identity reference

        Returns:
            Number of events anonymized
        """
        pass
