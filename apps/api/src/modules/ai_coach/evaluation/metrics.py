"""Metrics reporting for AI Coach evaluations."""

import logging
from datetime import datetime, UTC, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .orm import EvaluationResultORM

logger = logging.getLogger(__name__)


async def get_quality_summary(
    db: AsyncSession,
    days: int = 7,
) -> dict:
    """
    Get a summary of AI Coach quality metrics.

    Args:
        db: Database session
        days: Number of days to include

    Returns:
        Dictionary with quality metrics
    """
    period_start = datetime.now(UTC) - timedelta(days=days)

    query = select(
        func.count(EvaluationResultORM.id).label("total"),
        func.avg(EvaluationResultORM.overall_score).label("avg_overall"),
        func.avg(EvaluationResultORM.helpfulness_score).label("avg_helpfulness"),
        func.avg(EvaluationResultORM.safety_score).label("avg_safety"),
        func.avg(EvaluationResultORM.personalization_score).label("avg_personalization"),
        func.min(EvaluationResultORM.overall_score).label("min_overall"),
        func.max(EvaluationResultORM.overall_score).label("max_overall"),
    ).where(
        EvaluationResultORM.evaluated_at >= period_start
    )

    result = await db.execute(query)
    row = result.fetchone()

    if not row or row.total == 0:
        return {
            "period_days": days,
            "total_evaluations": 0,
            "status": "no_data",
        }

    # Determine overall status
    avg_overall = float(row.avg_overall or 0)
    if avg_overall >= 4.0:
        status = "excellent"
    elif avg_overall >= 3.5:
        status = "good"
    elif avg_overall >= 3.0:
        status = "acceptable"
    else:
        status = "needs_improvement"

    return {
        "period_days": days,
        "total_evaluations": row.total,
        "status": status,
        "scores": {
            "overall": {
                "average": round(avg_overall, 2),
                "min": round(float(row.min_overall or 0), 2),
                "max": round(float(row.max_overall or 0), 2),
            },
            "helpfulness": round(float(row.avg_helpfulness or 0), 2),
            "safety": round(float(row.avg_safety or 0), 2),
            "personalization": round(float(row.avg_personalization or 0), 2),
        },
    }


async def check_safety_alerts(
    db: AsyncSession,
    threshold: float = 3.0,
    hours: int = 24,
) -> dict:
    """
    Check for recent safety-related evaluation failures.

    Args:
        db: Database session
        threshold: Score below which is considered a concern
        hours: Hours to look back

    Returns:
        Dictionary with safety alert information
    """
    period_start = datetime.now(UTC) - timedelta(hours=hours)

    query = select(
        func.count(EvaluationResultORM.id).label("count"),
        func.avg(EvaluationResultORM.safety_score).label("avg_safety"),
    ).where(
        EvaluationResultORM.evaluated_at >= period_start,
        EvaluationResultORM.safety_score < threshold,
    )

    result = await db.execute(query)
    row = result.fetchone()

    concern_count = row.count if row else 0
    avg_safety = float(row.avg_safety) if row and row.avg_safety else 0

    return {
        "hours_checked": hours,
        "safety_threshold": threshold,
        "concerns_found": concern_count,
        "avg_safety_score": round(avg_safety, 2) if concern_count > 0 else None,
        "alert": concern_count > 0,
    }


async def get_trend_data(
    db: AsyncSession,
    days: int = 30,
) -> list[dict]:
    """
    Get daily trend data for evaluation scores.

    Args:
        db: Database session
        days: Number of days to include

    Returns:
        List of daily metric summaries
    """
    period_start = datetime.now(UTC) - timedelta(days=days)

    # Get evaluations grouped by day
    query = select(EvaluationResultORM).where(
        EvaluationResultORM.evaluated_at >= period_start
    ).order_by(EvaluationResultORM.evaluated_at.asc())

    result = await db.execute(query)
    evaluations = result.scalars().all()

    # Group by day
    daily_data: dict[str, list] = {}
    for e in evaluations:
        day_key = e.evaluated_at.strftime("%Y-%m-%d")
        if day_key not in daily_data:
            daily_data[day_key] = []
        daily_data[day_key].append(e)

    # Calculate daily averages
    trend = []
    for day, evals in sorted(daily_data.items()):
        avg_overall = sum(e.overall_score for e in evals) / len(evals)
        avg_safety = sum(e.safety_score for e in evals) / len(evals)

        trend.append({
            "date": day,
            "evaluations": len(evals),
            "avg_overall": round(avg_overall, 2),
            "avg_safety": round(avg_safety, 2),
        })

    return trend
