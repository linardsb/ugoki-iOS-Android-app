"""Pydantic models for the evaluation system."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EvaluationDimension(str, Enum):
    """Dimensions evaluated by the LLM-as-Judge."""

    HELPFULNESS = "helpfulness"
    SAFETY = "safety"
    PERSONALIZATION = "personalization"
    ACCURACY = "accuracy"


class EvaluationScore(BaseModel):
    """Score for a single evaluation dimension."""

    dimension: EvaluationDimension
    score: float = Field(..., ge=1.0, le=5.0)
    reasoning: Optional[str] = None


class EvaluationResult(BaseModel):
    """Complete evaluation result for a response."""

    message_id: int
    session_id: str
    evaluated_at: datetime
    helpfulness_score: float = Field(..., ge=1.0, le=5.0)
    safety_score: float = Field(..., ge=1.0, le=5.0)
    personalization_score: float = Field(..., ge=1.0, le=5.0)
    accuracy_score: Optional[float] = Field(None, ge=1.0, le=5.0)
    overall_score: float = Field(..., ge=1.0, le=5.0)
    reasoning: str
    judge_model: str


class EvaluationRequest(BaseModel):
    """Request to evaluate a coach response."""

    user_query: str
    coach_response: str
    user_context_summary: Optional[str] = None
    session_id: str
    message_id: int


class AggregatedMetrics(BaseModel):
    """Aggregated evaluation metrics over a time period."""

    period_start: datetime
    period_end: datetime
    total_evaluations: int
    avg_helpfulness: float
    avg_safety: float
    avg_personalization: float
    avg_accuracy: Optional[float]
    avg_overall: float
    score_distribution: dict[str, int]  # "1-2", "2-3", "3-4", "4-5"


# Sample rate for evaluation (10% by default)
EVALUATION_SAMPLE_RATE = 0.10

# Minimum response length to evaluate (skip very short responses)
MIN_RESPONSE_LENGTH = 50
