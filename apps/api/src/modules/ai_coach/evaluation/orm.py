"""SQLAlchemy ORM model for evaluation results."""

from datetime import datetime

from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class EvaluationResultORM(Base):
    """Database model for AI Coach response evaluations.

    Stores LLM-as-Judge evaluation scores for quality tracking.
    """

    __tablename__ = "ai_coach_evaluation"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    message_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("coach_messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    helpfulness_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    safety_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    personalization_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    accuracy_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    overall_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    reasoning: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    judge_model: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_evaluation_session", "session_id"),
        Index("idx_evaluation_date", "evaluated_at"),
        Index("idx_evaluation_overall", "overall_score"),
    )
