from datetime import datetime, timedelta, UTC
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import select, func, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.metrics.interface import MetricsInterface
from src.modules.metrics.models import (
    Metric,
    MetricSource,
    MetricTrend,
    MetricAggregate,
    MetricSummary,
    TrendDirection,
    BiomarkerFlag,
    UpdateMetricRequest,
    BiomarkerTestGroup,
)
from src.modules.metrics.orm import MetricORM

if TYPE_CHECKING:
    from src.modules.event_journal.service import EventJournalService


class MetricsService(MetricsInterface):
    """Implementation of the Metrics module."""

    def __init__(
        self,
        db: AsyncSession,
        event_journal: "EventJournalService | None" = None,
    ):
        self._db = db
        self._event_journal = event_journal

    async def record_metric(
        self,
        identity_id: str,
        metric_type: str,
        value: float,
        timestamp: datetime | None = None,
        source: MetricSource = MetricSource.USER_INPUT,
        note: str | None = None,
        # Biomarker metadata
        unit: str | None = None,
        reference_low: float | None = None,
        reference_high: float | None = None,
        flag: BiomarkerFlag | None = None,
    ) -> Metric:
        now = datetime.now(UTC)
        metric_id = str(uuid4())

        orm = MetricORM(
            id=metric_id,
            identity_id=identity_id,
            metric_type=metric_type,
            value=value,
            timestamp=timestamp or now,
            source=source,
            note=note,
            unit=unit,
            reference_low=reference_low,
            reference_high=reference_high,
            flag=flag,
        )
        self._db.add(orm)
        await self._db.flush()

        metric = self._to_model(orm)

        # Record event
        await self._record_metric_event(
            identity_id=identity_id,
            metric_type=metric_type,
            metric_id=metric_id,
            value=value,
            unit=unit,
        )

        return metric

    async def get_latest(
        self,
        identity_id: str,
        metric_type: str,
    ) -> Metric | None:
        result = await self._db.execute(
            select(MetricORM)
            .where(
                and_(
                    MetricORM.identity_id == identity_id,
                    MetricORM.metric_type == metric_type,
                )
            )
            .order_by(MetricORM.timestamp.desc())
            .limit(1)
        )
        orm = result.scalar_one_or_none()
        return self._to_model(orm) if orm else None

    async def get_history(
        self,
        identity_id: str,
        metric_type: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Metric]:
        query = select(MetricORM).where(
            and_(
                MetricORM.identity_id == identity_id,
                MetricORM.metric_type == metric_type,
            )
        )

        if start_time:
            query = query.where(MetricORM.timestamp >= start_time)
        if end_time:
            query = query.where(MetricORM.timestamp <= end_time)

        query = query.order_by(MetricORM.timestamp.desc())
        query = query.limit(limit).offset(offset)

        result = await self._db.execute(query)
        return [self._to_model(orm) for orm in result.scalars()]

    async def get_metric(self, metric_id: str) -> Metric | None:
        result = await self._db.execute(
            select(MetricORM).where(MetricORM.id == metric_id)
        )
        orm = result.scalar_one_or_none()
        return self._to_model(orm) if orm else None

    async def get_trend(
        self,
        identity_id: str,
        metric_type: str,
        period_days: int = 7,
    ) -> MetricTrend | None:
        now = datetime.now(UTC)
        period_start = now - timedelta(days=period_days)

        # Get metrics in the period
        metrics = await self.get_history(
            identity_id=identity_id,
            metric_type=metric_type,
            start_time=period_start,
            end_time=now,
            limit=1000,
        )

        if len(metrics) < 2:
            return None

        # Metrics are ordered desc, so first is latest, last is oldest
        end_value = metrics[0].value
        start_value = metrics[-1].value

        change_absolute = end_value - start_value
        change_percent = (change_absolute / start_value * 100) if start_value != 0 else 0

        # Determine direction with a small threshold for "stable"
        threshold_percent = 1.0  # 1% change threshold
        if abs(change_percent) < threshold_percent:
            direction = TrendDirection.STABLE
        elif change_absolute > 0:
            direction = TrendDirection.UP
        else:
            direction = TrendDirection.DOWN

        return MetricTrend(
            direction=direction,
            change_absolute=round(change_absolute, 2),
            change_percent=round(change_percent, 2),
            period_days=period_days,
            start_value=round(start_value, 2),
            end_value=round(end_value, 2),
            data_points=len(metrics),
        )

    async def get_aggregate(
        self,
        identity_id: str,
        metric_type: str,
        operation: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> MetricAggregate | None:
        # Map operation to SQLAlchemy function
        op_funcs = {
            "sum": func.sum(MetricORM.value),
            "avg": func.avg(MetricORM.value),
            "min": func.min(MetricORM.value),
            "max": func.max(MetricORM.value),
            "count": func.count(MetricORM.id),
        }

        if operation not in op_funcs:
            raise ValueError(f"Invalid operation: {operation}")

        query = select(
            op_funcs[operation].label("result"),
            func.count(MetricORM.id).label("count"),
        ).where(
            and_(
                MetricORM.identity_id == identity_id,
                MetricORM.metric_type == metric_type,
            )
        )

        now = datetime.now(UTC)
        actual_start = start_time or datetime.min.replace(tzinfo=UTC)
        actual_end = end_time or now

        if start_time:
            query = query.where(MetricORM.timestamp >= start_time)
        if end_time:
            query = query.where(MetricORM.timestamp <= end_time)

        result = await self._db.execute(query)
        row = result.one()

        if row.count == 0:
            return None

        return MetricAggregate(
            metric_type=metric_type,
            operation=operation,
            value=round(float(row.result), 2) if row.result is not None else 0,
            period_start=actual_start,
            period_end=actual_end,
            data_points=row.count,
        )

    async def get_summary(
        self,
        identity_id: str,
        metric_type: str,
    ) -> MetricSummary:
        # Get aggregates
        query = select(
            func.min(MetricORM.value).label("min_val"),
            func.max(MetricORM.value).label("max_val"),
            func.avg(MetricORM.value).label("avg_val"),
            func.count(MetricORM.id).label("count"),
        ).where(
            and_(
                MetricORM.identity_id == identity_id,
                MetricORM.metric_type == metric_type,
            )
        )

        result = await self._db.execute(query)
        row = result.one()

        # Get latest
        latest = await self.get_latest(identity_id, metric_type)

        return MetricSummary(
            metric_type=metric_type,
            latest_value=latest.value if latest else None,
            latest_timestamp=latest.timestamp if latest else None,
            min_value=round(row.min_val, 2) if row.min_val is not None else None,
            max_value=round(row.max_val, 2) if row.max_val is not None else None,
            avg_value=round(row.avg_val, 2) if row.avg_val is not None else None,
            total_entries=row.count,
        )

    async def delete_metric(self, metric_id: str) -> bool:
        result = await self._db.execute(
            select(MetricORM).where(MetricORM.id == metric_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            return False

        await self._db.delete(orm)
        await self._db.flush()
        return True

    async def delete_metrics(
        self,
        identity_id: str,
        metric_type: str | None = None,
        before: datetime | None = None,
    ) -> int:
        conditions = [MetricORM.identity_id == identity_id]

        if metric_type:
            conditions.append(MetricORM.metric_type == metric_type)
        if before:
            conditions.append(MetricORM.timestamp < before)

        result = await self._db.execute(
            delete(MetricORM).where(and_(*conditions))
        )
        await self._db.flush()
        return result.rowcount

    async def get_by_type_prefix(
        self,
        identity_id: str,
        prefix: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[Metric]:
        """Get all metrics with type starting with the given prefix."""
        query = select(MetricORM).where(
            and_(
                MetricORM.identity_id == identity_id,
                MetricORM.metric_type.startswith(prefix),
            )
        )

        if start_time:
            query = query.where(MetricORM.timestamp >= start_time)
        if end_time:
            query = query.where(MetricORM.timestamp <= end_time)

        query = query.order_by(MetricORM.timestamp.desc()).limit(limit)

        result = await self._db.execute(query)
        return [self._to_model(orm) for orm in result.scalars()]

    def _to_model(self, orm: MetricORM) -> Metric:
        # Ensure timezone-aware datetimes
        def ensure_tz(dt: datetime | None) -> datetime | None:
            if dt is None:
                return None
            return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt

        return Metric(
            id=orm.id,
            identity_id=orm.identity_id,
            metric_type=orm.metric_type,
            value=orm.value,
            timestamp=ensure_tz(orm.timestamp),  # type: ignore
            source=orm.source,
            note=orm.note,
            unit=orm.unit,
            reference_low=orm.reference_low,
            reference_high=orm.reference_high,
            flag=orm.flag,
            created_at=ensure_tz(orm.created_at) or datetime.now(UTC),
            updated_at=ensure_tz(orm.updated_at) or datetime.now(UTC),
        )

    async def _record_metric_event(
        self,
        identity_id: str,
        metric_type: str,
        metric_id: str,
        value: float,
        unit: str | None = None,
    ) -> None:
        """Record a metric event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        # Determine event type based on metric type
        if metric_type.startswith("weight"):
            event_type = EventType.WEIGHT_LOGGED
        elif metric_type.startswith("biomarker_"):
            event_type = EventType.BIOMARKER_UPLOADED
        else:
            # Don't record events for other metric types for now
            return

        metadata = {
            "metric_type": metric_type,
            "value": value,
        }
        if unit:
            metadata["unit"] = unit

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=event_type,
            related_id=metric_id,
            related_type="metric",
            source=EventSource.API,
            metadata=metadata,
        )

    async def update_metric(
        self,
        metric_id: str,
        request: UpdateMetricRequest,
    ) -> Metric | None:
        """Update an existing metric entry."""
        result = await self._db.execute(
            select(MetricORM).where(MetricORM.id == metric_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            return None

        # Update only provided fields
        if request.value is not None:
            orm.value = request.value
        if request.unit is not None:
            orm.unit = request.unit
        if request.reference_low is not None:
            orm.reference_low = request.reference_low
        if request.reference_high is not None:
            orm.reference_high = request.reference_high
        if request.flag is not None:
            orm.flag = request.flag
        if request.note is not None:
            orm.note = request.note

        orm.updated_at = datetime.now(UTC)
        await self._db.flush()

        return self._to_model(orm)

    async def get_biomarkers_grouped(
        self,
        identity_id: str,
    ) -> list[BiomarkerTestGroup]:
        """Get all biomarkers grouped by test date."""
        # Get all biomarkers for this identity
        biomarkers = await self.get_by_type_prefix(
            identity_id=identity_id,
            prefix="biomarker_",
            limit=5000,
        )

        if not biomarkers:
            return []

        # Group by date (ignoring time component)
        from collections import defaultdict
        groups: dict[str, list[Metric]] = defaultdict(list)

        for biomarker in biomarkers:
            date_key = biomarker.timestamp.date().isoformat()
            groups[date_key].append(biomarker)

        # Convert to BiomarkerTestGroup models
        result = []
        for date_str, markers in sorted(groups.items(), reverse=True):
            normal_count = sum(1 for m in markers if m.flag == BiomarkerFlag.NORMAL)
            abnormal_count = len(markers) - normal_count

            result.append(BiomarkerTestGroup(
                test_date=datetime.fromisoformat(date_str).replace(tzinfo=UTC),
                biomarker_count=len(markers),
                normal_count=normal_count,
                abnormal_count=abnormal_count,
                biomarkers=markers,
            ))

        return result
