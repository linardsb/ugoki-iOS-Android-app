"""Evaluation service for orchestrating response quality tracking."""

import logging
import random
from datetime import datetime, UTC, timedelta

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    EvaluationResult,
    EvaluationRequest,
    AggregatedMetrics,
    EVALUATION_SAMPLE_RATE,
    MIN_RESPONSE_LENGTH,
)
from .orm import EvaluationResultORM
from .judge import evaluate_response

logger = logging.getLogger(__name__)


class EvaluationService:
    """Service for managing response evaluations."""

    def __init__(self, db: AsyncSession):
        self._db = db

    def should_evaluate(self, response_length: int) -> bool:
        """
        Determine if a response should be evaluated based on sampling.

        Args:
            response_length: Length of the response text

        Returns:
            True if response should be evaluated
        """
        # Skip very short responses
        if response_length < MIN_RESPONSE_LENGTH:
            return False

        # Sample based on configured rate
        return random.random() < EVALUATION_SAMPLE_RATE

    async def evaluate_and_store(
        self,
        request: EvaluationRequest,
    ) -> EvaluationResult | None:
        """
        Evaluate a response and store the result.

        Args:
            request: Evaluation request with query and response

        Returns:
            EvaluationResult if successful, None otherwise
        """
        # Run evaluation
        result = await evaluate_response(request)

        if result is None:
            logger.debug(f"Evaluation failed for message {request.message_id}")
            return None

        # Store result
        evaluation_orm = EvaluationResultORM(
            message_id=result.message_id,
            session_id=result.session_id,
            evaluated_at=result.evaluated_at,
            helpfulness_score=result.helpfulness_score,
            safety_score=result.safety_score,
            personalization_score=result.personalization_score,
            accuracy_score=result.accuracy_score,
            overall_score=result.overall_score,
            reasoning=result.reasoning,
            judge_model=result.judge_model,
        )

        self._db.add(evaluation_orm)
        await self._db.commit()

        logger.info(
            f"Stored evaluation for message {result.message_id}: "
            f"overall={result.overall_score:.2f}"
        )

        return result

    async def get_aggregated_metrics(
        self,
        days: int = 7,
    ) -> AggregatedMetrics:
        """
        Get aggregated metrics for the specified time period.

        Args:
            days: Number of days to aggregate

        Returns:
            AggregatedMetrics with averages and distribution
        """
        period_end = datetime.now(UTC)
        period_start = period_end - timedelta(days=days)

        # Query for aggregated stats
        query = select(
            func.count(EvaluationResultORM.id).label("total"),
            func.avg(EvaluationResultORM.helpfulness_score).label("avg_helpfulness"),
            func.avg(EvaluationResultORM.safety_score).label("avg_safety"),
            func.avg(EvaluationResultORM.personalization_score).label("avg_personalization"),
            func.avg(EvaluationResultORM.accuracy_score).label("avg_accuracy"),
            func.avg(EvaluationResultORM.overall_score).label("avg_overall"),
        ).where(
            EvaluationResultORM.evaluated_at >= period_start
        )

        result = await self._db.execute(query)
        row = result.fetchone()

        if not row or row.total == 0:
            return AggregatedMetrics(
                period_start=period_start,
                period_end=period_end,
                total_evaluations=0,
                avg_helpfulness=0.0,
                avg_safety=0.0,
                avg_personalization=0.0,
                avg_accuracy=None,
                avg_overall=0.0,
                score_distribution={},
            )

        # Get score distribution
        distribution = await self._get_score_distribution(period_start)

        return AggregatedMetrics(
            period_start=period_start,
            period_end=period_end,
            total_evaluations=row.total,
            avg_helpfulness=round(float(row.avg_helpfulness or 0), 2),
            avg_safety=round(float(row.avg_safety or 0), 2),
            avg_personalization=round(float(row.avg_personalization or 0), 2),
            avg_accuracy=round(float(row.avg_accuracy), 2) if row.avg_accuracy else None,
            avg_overall=round(float(row.avg_overall or 0), 2),
            score_distribution=distribution,
        )

    async def _get_score_distribution(
        self,
        period_start: datetime,
    ) -> dict[str, int]:
        """Get distribution of overall scores by bucket."""
        distribution = {"1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0}

        # Count scores in each bucket
        for bucket_name, (low, high) in [
            ("1-2", (1.0, 2.0)),
            ("2-3", (2.0, 3.0)),
            ("3-4", (3.0, 4.0)),
            ("4-5", (4.0, 5.0)),
        ]:
            query = select(func.count()).where(
                and_(
                    EvaluationResultORM.evaluated_at >= period_start,
                    EvaluationResultORM.overall_score >= low,
                    EvaluationResultORM.overall_score < high if high < 5.0 else EvaluationResultORM.overall_score <= high,
                )
            )
            result = await self._db.execute(query)
            distribution[bucket_name] = result.scalar() or 0

        return distribution

    async def get_low_quality_responses(
        self,
        threshold: float = 2.5,
        limit: int = 10,
    ) -> list[EvaluationResult]:
        """
        Get responses that scored below the threshold.

        Useful for identifying areas needing improvement.

        Args:
            threshold: Score threshold (responses below this are returned)
            limit: Maximum number of results

        Returns:
            List of low-scoring EvaluationResults
        """
        query = select(EvaluationResultORM).where(
            EvaluationResultORM.overall_score < threshold
        ).order_by(
            EvaluationResultORM.overall_score.asc()
        ).limit(limit)

        result = await self._db.execute(query)
        evaluations = result.scalars().all()

        return [self._orm_to_model(e) for e in evaluations]

    async def get_safety_concerns(
        self,
        threshold: float = 3.0,
        limit: int = 10,
    ) -> list[EvaluationResult]:
        """
        Get responses with low safety scores.

        Critical for identifying potential safety issues.

        Args:
            threshold: Safety score threshold
            limit: Maximum number of results

        Returns:
            List of EvaluationResults with safety concerns
        """
        query = select(EvaluationResultORM).where(
            EvaluationResultORM.safety_score < threshold
        ).order_by(
            EvaluationResultORM.safety_score.asc()
        ).limit(limit)

        result = await self._db.execute(query)
        evaluations = result.scalars().all()

        return [self._orm_to_model(e) for e in evaluations]

    def _orm_to_model(self, orm: EvaluationResultORM) -> EvaluationResult:
        """Convert ORM object to Pydantic model."""
        return EvaluationResult(
            message_id=orm.message_id,
            session_id=orm.session_id,
            evaluated_at=orm.evaluated_at,
            helpfulness_score=orm.helpfulness_score,
            safety_score=orm.safety_score,
            personalization_score=orm.personalization_score,
            accuracy_score=orm.accuracy_score,
            overall_score=orm.overall_score,
            reasoning=orm.reasoning,
            judge_model=orm.judge_model,
        )
