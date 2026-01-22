"""
Health Sync Endpoints

Endpoints for syncing health data from Apple HealthKit and Android Health Connect.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.core.auth import get_current_identity
from src.modules.metrics.service import MetricsService
from src.modules.metrics.models import MetricSource


router = APIRouter(prefix="/health-sync", tags=["health"])


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST/RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────


class HealthSyncRequest(BaseModel):
    """Payload for syncing health data from mobile devices."""

    resting_heart_rate: float | None = Field(None, description="Resting heart rate in bpm")
    hrv: float | None = Field(None, description="Heart rate variability in ms")
    sleep_hours: float | None = Field(None, description="Hours of sleep")
    steps: int | None = Field(None, description="Step count")
    active_calories: float | None = Field(None, description="Active calories burned")
    weight_kg: float | None = Field(None, description="Body weight in kg")
    body_fat_pct: float | None = Field(None, description="Body fat percentage")
    synced_at: datetime = Field(..., description="Timestamp when data was collected")

    model_config = {
        "json_schema_extra": {
            "example": {
                "resting_heart_rate": 62,
                "hrv": 45,
                "sleep_hours": 7.5,
                "steps": 8500,
                "active_calories": 450,
                "weight_kg": 75.5,
                "body_fat_pct": 18.5,
                "synced_at": "2026-01-22T08:00:00Z",
            }
        }
    }


class HealthSyncResponse(BaseModel):
    """Response after syncing health data."""

    synced: list[str] = Field(..., description="List of metric types that were synced")
    timestamp: datetime = Field(..., description="Sync timestamp")


class HealthSyncStatus(BaseModel):
    """Status of health data sync for a user."""

    is_connected: bool = Field(..., description="Whether health data has been synced recently")
    last_sync: datetime | None = Field(None, description="Last sync timestamp")
    synced_metrics: list[str] = Field(..., description="List of metric types with synced data")


# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCIES
# ─────────────────────────────────────────────────────────────────────────────


def get_metrics_service(db: AsyncSession = Depends(get_db)) -> MetricsService:
    """Dependency injection for metrics service."""
    return MetricsService(db)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────


@router.post("", response_model=HealthSyncResponse, status_code=status.HTTP_201_CREATED)
async def sync_health_data(
    request: HealthSyncRequest,
    identity_id: str = Depends(get_current_identity),
    service: MetricsService = Depends(get_metrics_service),
) -> HealthSyncResponse:
    """
    Sync health data from mobile device.

    Receives health metrics from Apple HealthKit or Android Health Connect
    and stores them in the metrics system with source=DEVICE_SYNC.

    Supported metrics:
    - resting_heart_rate (bpm)
    - hrv (ms) - Heart Rate Variability
    - sleep_hours
    - steps
    - active_calories (kcal)
    - weight_kg
    - body_fat_pct (%)
    """
    synced = []

    # Define metric mappings: (metric_type, value, unit)
    metric_mappings = [
        ("health_resting_hr", request.resting_heart_rate, "bpm"),
        ("health_hrv", request.hrv, "ms"),
        ("sleep_hours", request.sleep_hours, "hours"),
        ("steps", request.steps, "count"),
        ("calories_burned", request.active_calories, "kcal"),
        ("weight_kg", request.weight_kg, "kg"),
        ("body_fat_pct", request.body_fat_pct, "%"),
    ]

    for metric_type, value, unit in metric_mappings:
        if value is not None:
            await service.record_metric(
                identity_id=identity_id,
                metric_type=metric_type,
                value=float(value),
                timestamp=request.synced_at,
                source=MetricSource.DEVICE_SYNC,
                unit=unit,
            )
            synced.append(metric_type)

    return HealthSyncResponse(synced=synced, timestamp=request.synced_at)


@router.get("/status", response_model=HealthSyncStatus)
async def get_sync_status(
    identity_id: str = Depends(get_current_identity),
    service: MetricsService = Depends(get_metrics_service),
) -> HealthSyncStatus:
    """
    Get health data sync status for the current user.

    Returns whether health data has been synced and which metrics are available.
    """
    # Health metrics we track from device sync
    health_metric_types = [
        "health_resting_hr",
        "health_hrv",
        "sleep_hours",
        "steps",
        "calories_burned",
        "weight_kg",
        "body_fat_pct",
    ]

    synced_metrics = []
    latest_sync: datetime | None = None

    for metric_type in health_metric_types:
        latest = await service.get_latest(identity_id, metric_type)
        if latest and latest.source == MetricSource.DEVICE_SYNC:
            synced_metrics.append(metric_type)
            if latest_sync is None or latest.timestamp > latest_sync:
                latest_sync = latest.timestamp

    return HealthSyncStatus(
        is_connected=len(synced_metrics) > 0,
        last_sync=latest_sync,
        synced_metrics=synced_metrics,
    )


@router.get("/context")
async def get_health_context(
    identity_id: str = Depends(get_current_identity),
    service: MetricsService = Depends(get_metrics_service),
) -> dict:
    """
    Get health context for AI Coach.

    Returns latest health metrics with insights for personalized coaching.
    This endpoint is used by the AI Coach to incorporate health data into responses.
    """
    health_metrics = {}
    insights = []

    # Metric types to fetch
    metric_configs = [
        ("health_resting_hr", "Resting Heart Rate", "bpm"),
        ("health_hrv", "Heart Rate Variability", "ms"),
        ("sleep_hours", "Sleep Duration", "hours"),
        ("steps", "Steps Today", "steps"),
    ]

    for metric_type, label, unit in metric_configs:
        latest = await service.get_latest(identity_id, metric_type)
        if latest:
            health_metrics[metric_type] = {
                "label": label,
                "value": latest.value,
                "unit": unit,
                "recorded_at": latest.timestamp.isoformat(),
            }

    if not health_metrics:
        return {
            "has_data": False,
            "message": "No health device connected. Connect Apple Health or Google Health Connect for personalized insights.",
        }

    # Generate insights based on health data
    if hrv_data := health_metrics.get("health_hrv"):
        hrv_value = hrv_data["value"]
        if hrv_value < 30:
            insights.append("HRV is low - consider a lighter workout or active recovery today")
        elif hrv_value > 60:
            insights.append("HRV is excellent - great day for an intense HIIT session")

    if sleep_data := health_metrics.get("sleep_hours"):
        sleep_value = sleep_data["value"]
        if sleep_value < 6:
            insights.append(
                f"Only {sleep_value:.1f}h sleep - consider extending your fasting window to support recovery"
            )
        elif sleep_value >= 7.5:
            insights.append("Well-rested - optimal conditions for fasting and exercise")

    if rhr_data := health_metrics.get("health_resting_hr"):
        rhr_value = rhr_data["value"]
        if rhr_value > 75:
            insights.append("Elevated resting HR may indicate stress or incomplete recovery")

    # Calculate recovery score
    recovery_score = await _calculate_recovery_score(service, identity_id, health_metrics)

    return {
        "has_data": True,
        "metrics": health_metrics,
        "insights": insights,
        "recovery": recovery_score,
    }


async def _calculate_recovery_score(
    service: MetricsService,
    identity_id: str,
    current_metrics: dict,
) -> dict:
    """Calculate recovery score based on health data."""
    score = 50  # baseline

    # HRV contribution
    if hrv_data := current_metrics.get("health_hrv"):
        hrv_trend = await service.get_trend(identity_id, "health_hrv", period_days=7)
        if hrv_trend:
            if hrv_trend.direction.value == "up":
                score += 20
            elif hrv_trend.direction.value == "down":
                score -= 15

    # Sleep contribution
    if sleep_data := current_metrics.get("sleep_hours"):
        sleep_value = sleep_data["value"]
        if sleep_value >= 7.5:
            score += 20
        elif sleep_value < 6:
            score -= 20

    # Resting HR contribution
    if rhr_data := current_metrics.get("health_resting_hr"):
        if rhr_data["value"] <= 60:
            score += 10
        elif rhr_data["value"] > 75:
            score -= 10

    # Clamp score between 0-100
    score = max(0, min(100, score))

    # Determine status
    if score >= 80:
        status = "excellent"
        recommendation = "Fully recovered - great day for high-intensity training"
    elif score >= 60:
        status = "good"
        recommendation = "Good recovery - moderate intensity recommended"
    elif score >= 40:
        status = "moderate"
        recommendation = "Partial recovery - consider lighter activity or longer fast"
    else:
        status = "needs_rest"
        recommendation = "Rest recommended - focus on sleep and gentle movement"

    return {
        "score": score,
        "status": status,
        "recommendation": recommendation,
    }
