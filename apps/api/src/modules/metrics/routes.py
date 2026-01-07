from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.metrics.models import (
    Metric,
    MetricTrend,
    MetricAggregate,
    MetricSummary,
    RecordMetricRequest,
    UpdateMetricRequest,
    BiomarkerTestGroup,
)
from src.modules.metrics.service import MetricsService
from src.modules.event_journal.service import EventJournalService

router = APIRouter(tags=["metrics"])


def get_event_journal_service(db: AsyncSession = Depends(get_db)) -> EventJournalService:
    return EventJournalService(db)


def get_metrics_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> MetricsService:
    return MetricsService(db, event_journal=event_journal)


@router.post("", response_model=Metric, status_code=status.HTTP_201_CREATED)
async def record_metric(
    identity_id: str,  # TODO: Extract from JWT
    request: RecordMetricRequest,
    service: MetricsService = Depends(get_metrics_service),
) -> Metric:
    """
    Record a new metric value.

    Common metric types:
    - weight_kg, weight_lbs: Body weight
    - body_fat_pct: Body fat percentage
    - water_ml: Water intake
    - calories_consumed, calories_burned: Calorie tracking
    - steps: Step count
    - workout_minutes: Exercise duration
    - fasting_hours: Fasting duration
    - biomarker_xxx: Blood test biomarkers (e.g., biomarker_haemoglobin)
    """
    return await service.record_metric(
        identity_id=identity_id,
        metric_type=request.metric_type,
        value=request.value,
        timestamp=request.timestamp,
        source=request.source,
        note=request.note,
        unit=request.unit,
        reference_low=request.reference_low,
        reference_high=request.reference_high,
        flag=request.flag,
    )


@router.get("/latest", response_model=Metric | None)
async def get_latest_metric(
    identity_id: str,  # TODO: Extract from JWT
    metric_type: str = Query(..., description="Type of metric (e.g., 'weight_kg', 'biomarker_haemoglobin')"),
    service: MetricsService = Depends(get_metrics_service),
) -> Metric | None:
    """Get the most recent value for a metric type."""
    return await service.get_latest(identity_id, metric_type)


@router.get("/history", response_model=list[Metric])
async def get_metric_history(
    identity_id: str,  # TODO: Extract from JWT
    metric_type: str = Query(..., description="Type of metric"),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    service: MetricsService = Depends(get_metrics_service),
) -> list[Metric]:
    """Get metric history with optional time filters."""
    return await service.get_history(
        identity_id=identity_id,
        metric_type=metric_type,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
        offset=offset,
    )


@router.get("/by-prefix", response_model=list[Metric])
async def get_metrics_by_prefix(
    identity_id: str,
    prefix: str = Query(..., description="Type prefix to match (e.g., 'biomarker_')"),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(1000, le=5000),
    service: MetricsService = Depends(get_metrics_service),
) -> list[Metric]:
    """
    Get all metrics with type starting with the given prefix.

    Useful for querying all biomarkers at once (prefix='biomarker_').
    """
    return await service.get_by_type_prefix(
        identity_id=identity_id,
        prefix=prefix,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )


@router.get("/trend", response_model=MetricTrend | None)
async def get_metric_trend(
    identity_id: str,  # TODO: Extract from JWT
    metric_type: str = Query(..., description="Type of metric"),
    period_days: int = Query(7, ge=1, le=365),
    service: MetricsService = Depends(get_metrics_service),
) -> MetricTrend | None:
    """
    Get trend analysis for a metric.

    Returns direction (up/down/stable), change amount, and percentage.
    Requires at least 2 data points in the period.
    """
    return await service.get_trend(
        identity_id=identity_id,
        metric_type=metric_type,
        period_days=period_days,
    )


@router.get("/aggregate", response_model=MetricAggregate | None)
async def get_metric_aggregate(
    identity_id: str,  # TODO: Extract from JWT
    metric_type: str = Query(..., description="Type of metric"),
    operation: str = Query("avg", pattern="^(sum|avg|min|max|count)$"),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    service: MetricsService = Depends(get_metrics_service),
) -> MetricAggregate | None:
    """
    Get aggregated metric value.

    Operations: sum, avg, min, max, count
    """
    try:
        return await service.get_aggregate(
            identity_id=identity_id,
            metric_type=metric_type,
            operation=operation,
            start_time=start_time,
            end_time=end_time,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/summary", response_model=MetricSummary)
async def get_metric_summary(
    identity_id: str,  # TODO: Extract from JWT
    metric_type: str = Query(..., description="Type of metric"),
    service: MetricsService = Depends(get_metrics_service),
) -> MetricSummary:
    """
    Get summary statistics for a metric type.

    Returns: latest value, min, max, average, total entries.
    """
    return await service.get_summary(identity_id, metric_type)


@router.get("/biomarkers/grouped", response_model=list[BiomarkerTestGroup])
async def get_biomarkers_grouped(
    identity_id: str,
    service: MetricsService = Depends(get_metrics_service),
) -> list[BiomarkerTestGroup]:
    """
    Get all biomarkers grouped by test date.

    Returns a list of test dates with their biomarkers, counts, and status summary.
    Useful for displaying bloodwork history timeline.
    """
    return await service.get_biomarkers_grouped(identity_id)


@router.get("/{metric_id}", response_model=Metric)
async def get_metric(
    metric_id: str,
    service: MetricsService = Depends(get_metrics_service),
) -> Metric:
    """Get a specific metric by ID."""
    metric = await service.get_metric(metric_id)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found",
        )
    return metric


@router.put("/{metric_id}", response_model=Metric)
async def update_metric(
    metric_id: str,
    request: UpdateMetricRequest,
    service: MetricsService = Depends(get_metrics_service),
) -> Metric:
    """
    Update a specific metric entry.

    Only provided fields will be updated (partial update).
    Useful for correcting AI-parsed biomarker values.
    """
    metric = await service.update_metric(metric_id, request)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found",
        )
    return metric


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(
    metric_id: str,
    service: MetricsService = Depends(get_metrics_service),
) -> None:
    """Delete a specific metric entry."""
    deleted = await service.delete_metric(metric_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found",
        )


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_metrics(
    identity_id: str,  # TODO: Extract from JWT
    metric_type: str | None = Query(None, description="Type of metric to delete"),
    before: datetime | None = Query(None),
    service: MetricsService = Depends(get_metrics_service),
) -> dict[str, int]:
    """
    Bulk delete metrics for an identity.

    Optionally filter by metric_type and/or timestamp.
    """
    count = await service.delete_metrics(
        identity_id=identity_id,
        metric_type=metric_type,
        before=before,
    )
    return {"deleted": count}
