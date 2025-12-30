"""
EVENT_JOURNAL Module - Service Implementation

Implements the EventJournalInterface with SQLAlchemy.
Events are immutable - once recorded, they cannot be modified.
"""

from datetime import datetime, UTC
from uuid import uuid4
import hashlib

from sqlalchemy import select, func, delete, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.event_journal.interface import EventJournalInterface
from src.modules.event_journal.models import (
    ActivityEvent,
    ActivityEventSummary,
    EventFeedItem,
    EventType,
    EventCategory,
    EventSource,
    get_category_for_event,
    EVENT_TITLES,
    EVENT_ICONS,
)
from src.modules.event_journal.orm import ActivityEventORM


class EventJournalService(EventJournalInterface):
    """Implementation of the EventJournal module."""

    def __init__(self, db: AsyncSession):
        self._db = db

    # =========================================================================
    # Recording Events
    # =========================================================================

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
        now = datetime.now(UTC)
        event_id = str(uuid4())
        category = get_category_for_event(event_type)

        orm = ActivityEventORM(
            id=event_id,
            identity_id=identity_id,
            event_type=event_type.value,
            category=category.value,
            timestamp=timestamp or now,
            related_id=related_id,
            related_type=related_type,
            source=source.value,
            event_metadata=metadata or {},
            description=description,
            created_at=now,
        )

        self._db.add(orm)
        await self._db.flush()

        return self._to_model(orm)

    # =========================================================================
    # Querying Events
    # =========================================================================

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
        query = select(ActivityEventORM).where(
            ActivityEventORM.identity_id == identity_id
        )

        if category:
            query = query.where(ActivityEventORM.category == category.value)

        if event_types:
            type_values = [et.value for et in event_types]
            query = query.where(ActivityEventORM.event_type.in_(type_values))

        if start_time:
            query = query.where(ActivityEventORM.timestamp >= start_time)

        if end_time:
            query = query.where(ActivityEventORM.timestamp <= end_time)

        query = query.order_by(ActivityEventORM.timestamp.desc())
        query = query.limit(limit).offset(offset)

        result = await self._db.execute(query)
        return [self._to_model(orm) for orm in result.scalars()]

    async def get_event(self, event_id: str) -> ActivityEvent | None:
        result = await self._db.execute(
            select(ActivityEventORM).where(ActivityEventORM.id == event_id)
        )
        orm = result.scalar_one_or_none()
        return self._to_model(orm) if orm else None

    async def get_events_by_related(
        self,
        related_id: str,
        related_type: str | None = None,
    ) -> list[ActivityEvent]:
        query = select(ActivityEventORM).where(
            ActivityEventORM.related_id == related_id
        )

        if related_type:
            query = query.where(ActivityEventORM.related_type == related_type)

        query = query.order_by(ActivityEventORM.timestamp.asc())

        result = await self._db.execute(query)
        return [self._to_model(orm) for orm in result.scalars()]

    # =========================================================================
    # Activity Feed
    # =========================================================================

    async def get_activity_feed(
        self,
        identity_id: str,
        category: EventCategory | None = None,
        limit: int = 20,
        before: datetime | None = None,
    ) -> list[EventFeedItem]:
        query = select(ActivityEventORM).where(
            ActivityEventORM.identity_id == identity_id
        )

        if category:
            query = query.where(ActivityEventORM.category == category.value)

        if before:
            query = query.where(ActivityEventORM.timestamp < before)

        query = query.order_by(ActivityEventORM.timestamp.desc())
        query = query.limit(limit)

        result = await self._db.execute(query)
        events = [self._to_model(orm) for orm in result.scalars()]

        return [self._to_feed_item(event) for event in events]

    # =========================================================================
    # Analytics
    # =========================================================================

    async def get_event_summary(
        self,
        identity_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> ActivityEventSummary:
        # Get all events in the period
        events = await self.get_events(
            identity_id=identity_id,
            start_time=start_time,
            end_time=end_time,
            limit=10000,  # Get all for summary
        )

        # Count by category
        by_category: dict[str, int] = {}
        by_type: dict[str, int] = {}

        for event in events:
            cat = event.category.value
            typ = event.event_type.value

            by_category[cat] = by_category.get(cat, 0) + 1
            by_type[typ] = by_type.get(typ, 0) + 1

        return ActivityEventSummary(
            total_events=len(events),
            events_by_category=by_category,
            events_by_type=by_type,
            period_start=start_time,
            period_end=end_time,
        )

    async def get_event_counts(
        self,
        identity_id: str,
        event_type: EventType,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> int:
        query = select(func.count(ActivityEventORM.id)).where(
            and_(
                ActivityEventORM.identity_id == identity_id,
                ActivityEventORM.event_type == event_type.value,
            )
        )

        if start_time:
            query = query.where(ActivityEventORM.timestamp >= start_time)

        if end_time:
            query = query.where(ActivityEventORM.timestamp <= end_time)

        result = await self._db.execute(query)
        return result.scalar() or 0

    # =========================================================================
    # GDPR Compliance
    # =========================================================================

    async def export_events(
        self,
        identity_id: str,
    ) -> list[ActivityEvent]:
        """Export all events for GDPR - no limit."""
        query = select(ActivityEventORM).where(
            ActivityEventORM.identity_id == identity_id
        ).order_by(ActivityEventORM.timestamp.asc())

        result = await self._db.execute(query)
        return [self._to_model(orm) for orm in result.scalars()]

    async def delete_events(
        self,
        identity_id: str,
    ) -> int:
        """Delete all events for GDPR erasure."""
        result = await self._db.execute(
            delete(ActivityEventORM).where(
                ActivityEventORM.identity_id == identity_id
            )
        )
        await self._db.flush()
        return result.rowcount

    async def anonymize_events(
        self,
        identity_id: str,
    ) -> int:
        """Anonymize events - replace identity with hash."""
        # Create a one-way hash of the identity
        anon_id = hashlib.sha256(
            f"anon:{identity_id}".encode()
        ).hexdigest()[:36]

        result = await self._db.execute(
            update(ActivityEventORM)
            .where(ActivityEventORM.identity_id == identity_id)
            .values(
                identity_id=anon_id,
                # Also clear any PII from event_metadata
                event_metadata={},
                description=None,
            )
        )
        await self._db.flush()
        return result.rowcount

    # =========================================================================
    # Helpers
    # =========================================================================

    def _to_model(self, orm: ActivityEventORM) -> ActivityEvent:
        """Convert ORM to Pydantic model."""

        def ensure_tz(dt: datetime | None) -> datetime:
            if dt is None:
                return datetime.now(UTC)
            return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt

        return ActivityEvent(
            id=orm.id,
            identity_id=orm.identity_id,
            event_type=EventType(orm.event_type),
            category=EventCategory(orm.category),
            timestamp=ensure_tz(orm.timestamp),
            related_id=orm.related_id,
            related_type=orm.related_type,
            source=EventSource(orm.source),
            metadata=orm.event_metadata or {},
            description=orm.description,
            created_at=ensure_tz(orm.created_at),
        )

    def _to_feed_item(self, event: ActivityEvent) -> EventFeedItem:
        """Convert ActivityEvent to display-ready feed item."""
        title = EVENT_TITLES.get(event.event_type, event.event_type.value)
        icon = EVENT_ICONS.get(event.event_type, "circle")

        # Build description from event data
        description = event.description
        if not description:
            description = self._build_description(event)

        return EventFeedItem(
            id=event.id,
            event_type=event.event_type,
            category=event.category,
            timestamp=event.timestamp,
            title=title,
            description=description,
            icon=icon,
            metadata=event.metadata,
        )

    def _build_description(self, event: ActivityEvent) -> str | None:
        """Build a human-readable description from event metadata."""
        metadata = event.metadata

        if event.event_type == EventType.FAST_COMPLETED:
            hours = metadata.get("duration_hours")
            xp = metadata.get("xp_earned")
            if hours:
                desc = f"{hours:.0f} hour fast"
                if xp:
                    desc += f" · {xp} XP earned"
                return desc

        if event.event_type == EventType.WORKOUT_COMPLETED:
            name = metadata.get("workout_name")
            duration = metadata.get("duration_minutes")
            xp = metadata.get("xp_earned")
            parts = []
            if name:
                parts.append(name)
            if duration:
                parts.append(f"{duration} min")
            if xp:
                parts.append(f"{xp} XP")
            return " · ".join(parts) if parts else None

        if event.event_type == EventType.XP_EARNED:
            amount = metadata.get("amount")
            reason = metadata.get("reason")
            if amount:
                desc = f"+{amount} XP"
                if reason:
                    desc += f" for {reason}"
                return desc

        if event.event_type == EventType.LEVEL_UP:
            level = metadata.get("new_level")
            if level:
                return f"Reached level {level}"

        if event.event_type == EventType.ACHIEVEMENT_UNLOCKED:
            name = metadata.get("achievement_name")
            if name:
                return name

        if event.event_type == EventType.WEIGHT_LOGGED:
            value = metadata.get("value")
            unit = metadata.get("unit", "kg")
            if value:
                return f"{value} {unit}"

        if event.event_type == EventType.STREAK_INCREMENTED:
            streak_type = metadata.get("streak_type")
            count = metadata.get("current_count")
            if streak_type and count:
                return f"{streak_type.replace('_', ' ').title()} streak: {count} days"

        return None
