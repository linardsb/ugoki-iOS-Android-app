"""AI Coach Evaluation System.

Implements LLM-as-Judge evaluation for response quality tracking.

Usage:
    from src.modules.ai_coach.evaluation import EvaluationService, EvaluationRequest

    service = EvaluationService(db)

    # Check if we should evaluate this response
    if service.should_evaluate(len(response)):
        request = EvaluationRequest(
            user_query=query,
            coach_response=response,
            user_context_summary=context,
            session_id=session_id,
            message_id=message_id,
        )
        result = await service.evaluate_and_store(request)

    # Get aggregated metrics
    metrics = await service.get_aggregated_metrics(days=7)
"""

from .models import (
    EvaluationDimension,
    EvaluationScore,
    EvaluationResult,
    EvaluationRequest,
    AggregatedMetrics,
    EVALUATION_SAMPLE_RATE,
    MIN_RESPONSE_LENGTH,
)
from .orm import EvaluationResultORM
from .service import EvaluationService
from .judge import evaluate_response
from .metrics import (
    get_quality_summary,
    check_safety_alerts,
    get_trend_data,
)

__all__ = [
    # Models
    "EvaluationDimension",
    "EvaluationScore",
    "EvaluationResult",
    "EvaluationRequest",
    "AggregatedMetrics",
    "EVALUATION_SAMPLE_RATE",
    "MIN_RESPONSE_LENGTH",
    # ORM
    "EvaluationResultORM",
    # Service
    "EvaluationService",
    # Judge
    "evaluate_response",
    # Metrics
    "get_quality_summary",
    "check_safety_alerts",
    "get_trend_data",
]
