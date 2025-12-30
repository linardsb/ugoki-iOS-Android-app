"""
EVENT_JOURNAL Module

Purpose: Record and query immutable activity events for audit trails,
user activity feeds, analytics, and GDPR compliance.

The EVENT_JOURNAL module owns the ACTIVITY_EVENT primitive - an immutable
record of a point-in-time occurrence. All significant user activities
across the system flow through this module.

Key Features:
- Immutable event recording (events are never modified)
- Activity feed for user display
- Event analytics and summaries
- GDPR compliance (export, delete, anonymize)

Usage:
    from src.modules.event_journal import (
        EventJournalInterface,
        EventJournalService,
        ActivityEvent,
        EventType,
        EventCategory,
    )
"""

from src.modules.event_journal.interface import EventJournalInterface
from src.modules.event_journal.service import EventJournalService
from src.modules.event_journal.models import (
    ActivityEvent,
    ActivityEventSummary,
    EventFeedItem,
    EventType,
    EventCategory,
    EventSource,
)

__all__ = [
    "EventJournalInterface",
    "EventJournalService",
    "ActivityEvent",
    "ActivityEventSummary",
    "EventFeedItem",
    "EventType",
    "EventCategory",
    "EventSource",
]
