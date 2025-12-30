from datetime import datetime, UTC
from typing import Any, TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.time_keeper.interface import TimeKeeperInterface
from src.modules.time_keeper.models import TimeWindow, WindowType, WindowState
from src.modules.time_keeper.orm import TimeWindowORM

if TYPE_CHECKING:
    from src.modules.event_journal.service import EventJournalService


class TimeKeeperService(TimeKeeperInterface):
    """Implementation of the TimeKeeper module."""

    # Define conflict rules
    CONFLICTS: dict[WindowType, set[WindowType]] = {
        WindowType.FAST: {WindowType.EATING},
        WindowType.EATING: {WindowType.FAST},
        # Workouts can happen during fasting or eating
        WindowType.WORKOUT: set(),
        WindowType.RECOVERY: set(),
    }

    def __init__(
        self,
        db: AsyncSession,
        event_journal: "EventJournalService | None" = None,
    ):
        self._db = db
        self._event_journal = event_journal

    async def open_window(
        self,
        identity_id: str,
        window_type: WindowType,
        scheduled_end: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> TimeWindow:
        # Check for conflicts
        conflicting_types = self.CONFLICTS.get(window_type, set())
        for conflict_type in conflicting_types:
            active = await self.get_active_window(identity_id, conflict_type)
            if active:
                raise ValueError(
                    f"Cannot open {window_type.value} while {conflict_type.value} is active"
                )

        # Also check if same type already active
        existing = await self.get_active_window(identity_id, window_type)
        if existing:
            raise ValueError(f"A {window_type.value} window is already active")

        now = datetime.now(UTC)
        window_id = str(uuid4())

        orm = TimeWindowORM(
            id=window_id,
            identity_id=identity_id,
            window_type=window_type,
            state=WindowState.ACTIVE,
            start_time=now,
            scheduled_end=scheduled_end,
            window_metadata=metadata or {},
        )
        self._db.add(orm)
        await self._db.flush()

        window = self._to_model(orm)

        # Record event
        await self._record_window_event(
            identity_id=identity_id,
            window_type=window_type,
            action="started",
            window_id=window_id,
            metadata=metadata,
        )

        return window

    async def close_window(
        self,
        window_id: str,
        end_state: WindowState = WindowState.COMPLETED,
        metadata: dict[str, Any] | None = None,
    ) -> TimeWindow:
        result = await self._db.execute(
            select(TimeWindowORM).where(TimeWindowORM.id == window_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            raise ValueError("Window not found")

        if orm.state != WindowState.ACTIVE:
            raise ValueError(f"Window is not active (current state: {orm.state})")

        orm.state = end_state
        orm.end_time = datetime.now(UTC)
        if metadata:
            orm.window_metadata = {**orm.window_metadata, **metadata}

        await self._db.flush()

        window = self._to_model(orm)

        # Calculate duration for event metadata
        duration_seconds = int((orm.end_time - orm.start_time.replace(tzinfo=UTC)).total_seconds())
        duration_hours = round(duration_seconds / 3600, 2)

        # Record event
        action = "completed" if end_state == WindowState.COMPLETED else "abandoned"
        await self._record_window_event(
            identity_id=orm.identity_id,
            window_type=orm.window_type,
            action=action,
            window_id=window_id,
            metadata={
                **(metadata or {}),
                "duration_hours": duration_hours,
                "duration_seconds": duration_seconds,
            },
        )

        return window

    async def extend_window(
        self,
        window_id: str,
        new_end: datetime,
    ) -> TimeWindow:
        result = await self._db.execute(
            select(TimeWindowORM).where(TimeWindowORM.id == window_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            raise ValueError("Window not found")

        if orm.state != WindowState.ACTIVE:
            raise ValueError("Window is not active")

        old_end = orm.scheduled_end
        orm.scheduled_end = new_end
        await self._db.flush()

        window = self._to_model(orm)

        # Record event
        await self._record_window_event(
            identity_id=orm.identity_id,
            window_type=orm.window_type,
            action="extended",
            window_id=window_id,
            metadata={
                "old_scheduled_end": old_end.isoformat() if old_end else None,
                "new_scheduled_end": new_end.isoformat(),
            },
        )

        return window

    async def get_active_window(
        self,
        identity_id: str,
        window_type: WindowType | None = None,
    ) -> TimeWindow | None:
        query = select(TimeWindowORM).where(
            and_(
                TimeWindowORM.identity_id == identity_id,
                TimeWindowORM.state == WindowState.ACTIVE,
            )
        )

        if window_type:
            query = query.where(TimeWindowORM.window_type == window_type)

        result = await self._db.execute(query)
        orm = result.scalar_one_or_none()

        return self._to_model(orm) if orm else None

    async def get_window(self, window_id: str) -> TimeWindow | None:
        result = await self._db.execute(
            select(TimeWindowORM).where(TimeWindowORM.id == window_id)
        )
        orm = result.scalar_one_or_none()
        return self._to_model(orm) if orm else None

    async def get_windows(
        self,
        identity_id: str,
        window_type: WindowType | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[TimeWindow]:
        query = select(TimeWindowORM).where(
            TimeWindowORM.identity_id == identity_id
        )

        if window_type:
            query = query.where(TimeWindowORM.window_type == window_type)
        if start_time:
            query = query.where(TimeWindowORM.start_time >= start_time)
        if end_time:
            query = query.where(TimeWindowORM.start_time <= end_time)

        query = query.order_by(TimeWindowORM.start_time.desc())
        query = query.limit(limit).offset(offset)

        result = await self._db.execute(query)
        return [self._to_model(orm) for orm in result.scalars()]

    async def get_elapsed_time(self, window_id: str) -> int:
        window = await self.get_window(window_id)
        if not window:
            raise ValueError("Window not found")

        # Ensure timezone-aware comparison
        start = window.start_time.replace(tzinfo=UTC) if window.start_time.tzinfo is None else window.start_time
        if window.end_time:
            end = window.end_time.replace(tzinfo=UTC) if window.end_time.tzinfo is None else window.end_time
        else:
            end = datetime.now(UTC)
        return int((end - start).total_seconds())

    async def get_remaining_time(self, window_id: str) -> int | None:
        window = await self.get_window(window_id)
        if not window:
            raise ValueError("Window not found")

        if not window.scheduled_end:
            return None

        # Ensure timezone-aware comparison
        scheduled = window.scheduled_end.replace(tzinfo=UTC) if window.scheduled_end.tzinfo is None else window.scheduled_end
        remaining = (scheduled - datetime.now(UTC)).total_seconds()
        return max(0, int(remaining))

    def _to_model(self, orm: TimeWindowORM) -> TimeWindow:
        # Ensure timezone-aware datetimes
        def ensure_tz(dt: datetime | None) -> datetime | None:
            if dt is None:
                return None
            return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt

        return TimeWindow(
            id=orm.id,
            identity_id=orm.identity_id,
            start_time=ensure_tz(orm.start_time),  # type: ignore
            end_time=ensure_tz(orm.end_time),
            scheduled_end=ensure_tz(orm.scheduled_end),
            window_type=orm.window_type,
            state=orm.state,
            metadata=orm.window_metadata or {},
            created_at=ensure_tz(orm.created_at) or datetime.now(UTC),
            updated_at=ensure_tz(orm.updated_at) or datetime.now(UTC),
        )

    async def _record_window_event(
        self,
        identity_id: str,
        window_type: WindowType,
        action: str,
        window_id: str,
        metadata: dict | None = None,
    ) -> None:
        """Record a time window event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        # Map window type + action to event type
        event_type_map = {
            (WindowType.FAST, "started"): EventType.FAST_STARTED,
            (WindowType.FAST, "completed"): EventType.FAST_COMPLETED,
            (WindowType.FAST, "abandoned"): EventType.FAST_ABANDONED,
            (WindowType.FAST, "extended"): EventType.FAST_EXTENDED,
            (WindowType.WORKOUT, "started"): EventType.WORKOUT_STARTED,
            (WindowType.WORKOUT, "completed"): EventType.WORKOUT_COMPLETED,
            (WindowType.WORKOUT, "abandoned"): EventType.WORKOUT_ABANDONED,
        }

        event_type = event_type_map.get((window_type, action))
        if not event_type:
            return

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=event_type,
            related_id=window_id,
            related_type="time_window",
            source=EventSource.API,
            metadata={
                "window_type": window_type.value,
                **(metadata or {}),
            },
        )
