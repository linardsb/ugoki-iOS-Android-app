"""SQLAlchemy ORM model for user memories."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class UserMemoryORM(Base):
    """Database model for extracted user memories.

    Stores facts, preferences, goals, and constraints extracted
    from coaching conversations for personalization.
    """

    __tablename__ = "ai_coach_user_memory"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    identity_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=False,
    )
    memory_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # 'fact', 'preference', 'goal', 'constraint'
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # 'injury', 'schedule', 'equipment', etc.
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        default=0.8,
        nullable=False,
    )
    source_session_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    verified_by_user: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_user_memory_identity_category", "identity_id", "category"),
        Index("idx_user_memory_identity_type", "identity_id", "memory_type"),
        Index("idx_user_memory_identity_active", "identity_id", "is_active"),
    )
