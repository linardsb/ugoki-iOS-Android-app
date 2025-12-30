from abc import ABC, abstractmethod
from datetime import datetime

from src.modules.metrics.models import (
    Metric,
    MetricSource,
    MetricTrend,
    MetricAggregate,
    MetricSummary,
    BiomarkerFlag,
)


class MetricsInterface(ABC):
    """
    METRICS Module Interface (v2)

    Purpose: Store and query numeric measurements over time.
    Supports both standard metrics (weight, calories) and biomarkers (blood tests).

    This interface hides:
    - Storage mechanism (SQL, time-series DB, etc.)
    - Aggregation algorithms
    - Caching strategies
    - Data retention policies

    Consumers never know:
    - Internal metric_id format
    - Database schema
    - How trends are calculated
    - Storage optimization details
    """

    # =========================================================================
    # Recording Metrics
    # =========================================================================

    @abstractmethod
    async def record_metric(
        self,
        identity_id: str,
        metric_type: str,
        value: float,
        timestamp: datetime | None = None,
        source: MetricSource = MetricSource.USER_INPUT,
        note: str | None = None,
        # Biomarker metadata (optional)
        unit: str | None = None,
        reference_low: float | None = None,
        reference_high: float | None = None,
        flag: BiomarkerFlag | None = None,
    ) -> Metric:
        """
        Record a new metric value.

        Args:
            identity_id: Opaque identity reference
            metric_type: Type of metric (e.g., 'weight_kg', 'biomarker_haemoglobin')
            value: Numeric value
            timestamp: When measured (defaults to now)
            source: Where the data came from
            note: Optional note about the measurement
            unit: Unit of measurement (for biomarkers)
            reference_low: Lower reference range (for biomarkers)
            reference_high: Upper reference range (for biomarkers)
            flag: Status flag (low, normal, high, abnormal)

        Returns:
            The recorded Metric
        """
        pass

    # =========================================================================
    # Querying Metrics
    # =========================================================================

    @abstractmethod
    async def get_latest(
        self,
        identity_id: str,
        metric_type: str,
    ) -> Metric | None:
        """
        Get the most recent metric of a given type.

        Args:
            identity_id: Opaque identity reference
            metric_type: Type of metric

        Returns:
            Latest Metric or None if no data
        """
        pass

    @abstractmethod
    async def get_history(
        self,
        identity_id: str,
        metric_type: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Metric]:
        """
        Get metric history within a time range.

        Args:
            identity_id: Opaque identity reference
            metric_type: Type of metric
            start_time: Filter from this time (inclusive)
            end_time: Filter until this time (inclusive)
            limit: Maximum results
            offset: Pagination offset

        Returns:
            List of Metrics ordered by timestamp descending
        """
        pass

    @abstractmethod
    async def get_metric(self, metric_id: str) -> Metric | None:
        """
        Get a specific metric by ID.

        Args:
            metric_id: Opaque metric reference

        Returns:
            Metric if found, None otherwise
        """
        pass

    # =========================================================================
    # Analytics
    # =========================================================================

    @abstractmethod
    async def get_trend(
        self,
        identity_id: str,
        metric_type: str,
        period_days: int = 7,
    ) -> MetricTrend | None:
        """
        Calculate trend for a metric over a period.

        Args:
            identity_id: Opaque identity reference
            metric_type: Type of metric
            period_days: Number of days to analyze

        Returns:
            MetricTrend with direction and change info, or None if insufficient data
        """
        pass

    @abstractmethod
    async def get_aggregate(
        self,
        identity_id: str,
        metric_type: str,
        operation: str,  # sum, avg, min, max, count
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> MetricAggregate | None:
        """
        Get aggregated metric value.

        Args:
            identity_id: Opaque identity reference
            metric_type: Type of metric
            operation: Aggregation operation (sum, avg, min, max, count)
            start_time: Period start
            end_time: Period end

        Returns:
            MetricAggregate with computed value
        """
        pass

    @abstractmethod
    async def get_summary(
        self,
        identity_id: str,
        metric_type: str,
    ) -> MetricSummary:
        """
        Get summary statistics for a metric type.

        Args:
            identity_id: Opaque identity reference
            metric_type: Type of metric

        Returns:
            MetricSummary with latest, min, max, avg values
        """
        pass

    # =========================================================================
    # Biomarker Queries
    # =========================================================================

    @abstractmethod
    async def get_by_type_prefix(
        self,
        identity_id: str,
        prefix: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[Metric]:
        """
        Get all metrics with a type starting with the given prefix.

        Useful for querying all biomarkers (prefix='biomarker_').

        Args:
            identity_id: Opaque identity reference
            prefix: Type prefix to match (e.g., 'biomarker_')
            start_time: Optional filter from this time
            end_time: Optional filter until this time
            limit: Maximum results

        Returns:
            List of matching Metrics
        """
        pass

    # =========================================================================
    # Management
    # =========================================================================

    @abstractmethod
    async def delete_metric(self, metric_id: str) -> bool:
        """
        Delete a specific metric entry.

        Args:
            metric_id: Opaque metric reference

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def delete_metrics(
        self,
        identity_id: str,
        metric_type: str | None = None,
        before: datetime | None = None,
    ) -> int:
        """
        Bulk delete metrics for an identity.

        Args:
            identity_id: Opaque identity reference
            metric_type: Optional filter by type (None = all types)
            before: Optional filter by timestamp (delete older than)

        Returns:
            Number of metrics deleted
        """
        pass
