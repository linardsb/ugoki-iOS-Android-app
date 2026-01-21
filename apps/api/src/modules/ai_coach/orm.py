"""SQLAlchemy ORM models for AI_COACH module."""

from datetime import datetime

from sqlalchemy import String, Integer, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from src.db.base import Base, TimestampMixin


class CoachConversationORM(Base, TimestampMixin):
    """Database model for coach conversation sessions."""

    __tablename__ = "coach_conversations"

    session_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    identity_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    session_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)


class CoachMessageORM(Base):
    """Database model for individual coach messages."""

    __tablename__ = "coach_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("coach_conversations.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message: Mapped[dict] = mapped_column(JSON, nullable=False)  # {type: 'human'|'ai', content, files?}
    message_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # Pydantic AI message format
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )


class CoachRequestORM(Base):
    """Database model for rate limiting and usage tracking."""

    __tablename__ = "coach_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
        index=True,
    )


class CoachDocumentORM(Base, TimestampMixin):
    """Database model for RAG documents with vector embeddings."""

    __tablename__ = "coach_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    doc_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    identity_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
