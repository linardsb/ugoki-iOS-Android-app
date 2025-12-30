from datetime import datetime

from sqlalchemy import String, Float, DateTime, Text, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin
from src.modules.metrics.models import MetricSource, BiomarkerFlag


class MetricORM(Base, TimestampMixin):
    """Database model for Metric - hidden from interface consumers."""

    __tablename__ = "metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    metric_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    source: Mapped[MetricSource] = mapped_column(
        SQLEnum(MetricSource), nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Biomarker metadata (optional, used for blood test results)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    flag: Mapped[BiomarkerFlag | None] = mapped_column(
        SQLEnum(BiomarkerFlag), nullable=True
    )

    # Composite index for common query patterns
    __table_args__ = (
        Index("ix_metrics_identity_type_timestamp", "identity_id", "metric_type", "timestamp"),
        Index("ix_metrics_type_prefix", "metric_type"),  # For prefix queries
    )
