from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class MetricType(str, Enum):
    """Common metric types (not exhaustive - metric_type is a string)."""
    WEIGHT_KG = "weight_kg"
    WEIGHT_LBS = "weight_lbs"
    BODY_FAT_PCT = "body_fat_pct"
    WATER_ML = "water_ml"
    CALORIES_CONSUMED = "calories_consumed"
    CALORIES_BURNED = "calories_burned"
    STEPS = "steps"
    WORKOUT_MINUTES = "workout_minutes"
    FASTING_HOURS = "fasting_hours"
    SLEEP_HOURS = "sleep_hours"


class MetricSource(str, Enum):
    """Source of the metric data."""
    USER_INPUT = "user_input"
    CALCULATED = "calculated"
    DEVICE_SYNC = "device_sync"


class BiomarkerFlag(str, Enum):
    """Flag indicating if a biomarker is within reference range."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    ABNORMAL = "abnormal"


class TrendDirection(str, Enum):
    """Direction of a metric trend."""
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class Metric(BaseModel):
    """
    Core METRIC primitive.

    A measured value with type, value, and timestamp.
    Used for weight, calories, steps, biomarkers, etc.
    """
    id: str = Field(..., description="Opaque metric reference")
    identity_id: str = Field(..., description="Owner identity reference")
    metric_type: str = Field(..., description="Type of metric (e.g., 'weight_kg', 'biomarker_haemoglobin')")
    value: float
    timestamp: datetime
    source: MetricSource
    note: str | None = None

    # Biomarker metadata (optional, used for blood test results)
    unit: str | None = None
    reference_low: float | None = None
    reference_high: float | None = None
    flag: BiomarkerFlag | None = None

    created_at: datetime
    updated_at: datetime


class MetricTrend(BaseModel):
    """Trend analysis for a metric type."""
    direction: TrendDirection
    change_absolute: float
    change_percent: float
    period_days: int
    start_value: float
    end_value: float
    data_points: int


class MetricAggregate(BaseModel):
    """Aggregated metric values."""
    metric_type: str
    operation: str  # sum, avg, min, max, count
    value: float
    period_start: datetime
    period_end: datetime
    data_points: int


class MetricSummary(BaseModel):
    """Summary statistics for a metric."""
    metric_type: str
    latest_value: float | None
    latest_timestamp: datetime | None
    min_value: float | None
    max_value: float | None
    avg_value: float | None
    total_entries: int


# Request/Response models
class RecordMetricRequest(BaseModel):
    metric_type: str = Field(..., description="Type of metric (use MetricType enum values or 'biomarker_xxx')")
    value: float
    timestamp: datetime | None = None  # Defaults to now
    source: MetricSource = MetricSource.USER_INPUT
    note: str | None = None
    # Biomarker metadata
    unit: str | None = None
    reference_low: float | None = None
    reference_high: float | None = None
    flag: BiomarkerFlag | None = None


class GetHistoryRequest(BaseModel):
    metric_type: str
    start_time: datetime | None = None
    end_time: datetime | None = None
    granularity: str = "raw"  # raw, hourly, daily, weekly
    limit: int = 100


class GetTrendRequest(BaseModel):
    metric_type: str
    period_days: int = 7


class GetAggregateRequest(BaseModel):
    metric_type: str
    operation: str = "avg"  # sum, avg, min, max, count
    start_time: datetime | None = None
    end_time: datetime | None = None


class UpdateMetricRequest(BaseModel):
    """Request to update an existing metric."""
    value: float | None = None
    unit: str | None = None
    reference_low: float | None = None
    reference_high: float | None = None
    flag: BiomarkerFlag | None = None
    note: str | None = None


class BiomarkerTestGroup(BaseModel):
    """Biomarkers grouped by test date."""
    test_date: datetime
    biomarker_count: int
    normal_count: int
    abnormal_count: int
    biomarkers: list[Metric]
