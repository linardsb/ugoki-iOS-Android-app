"""SQLAlchemy ORM models for RESEARCH module."""

from datetime import datetime, date

from sqlalchemy import (
    String, Integer, Text, Boolean, DateTime, Date,
    Enum as SQLEnum, ForeignKey, Index, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin
from src.modules.research.models import ResearchTopic, ResearchSource


class ResearchPaperORM(Base, TimestampMixin):
    """Database model for cached research papers."""

    __tablename__ = "research_papers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    pmid: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    doi: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[str | None] = mapped_column(JSON, nullable=True)  # JSON array
    journal: Mapped[str | None] = mapped_column(String(500), nullable=True)
    publication_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    topic: Mapped[ResearchTopic] = mapped_column(
        SQLEnum(ResearchTopic), nullable=False
    )
    abstract: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str] = mapped_column(String(500), nullable=False)
    open_access: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[ResearchSource] = mapped_column(
        SQLEnum(ResearchSource), nullable=False, default=ResearchSource.PUBMED
    )

    # AI-generated digest (cached)
    one_liner: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_benefits: Mapped[str | None] = mapped_column(JSON, nullable=True)  # JSON array
    audience_tags: Mapped[str | None] = mapped_column(JSON, nullable=True)  # JSON array of strings
    who_benefits: Mapped[str | None] = mapped_column(Text, nullable=True)  # Deprecated, use audience_tags
    tldr: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    saved_by: Mapped[list["UserSavedResearchORM"]] = relationship(
        back_populates="paper", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_research_papers_topic", "topic"),
        Index("ix_research_papers_pmid", "pmid"),
        Index("ix_research_papers_doi", "doi"),
        Index("ix_research_papers_date", "publication_date"),
    )


class UserSavedResearchORM(Base):
    """Database model for user's saved research papers."""

    __tablename__ = "user_saved_research"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    research_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("research_papers.id"), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    saved_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Relationships
    paper: Mapped[ResearchPaperORM] = relationship(back_populates="saved_by")

    __table_args__ = (
        Index("ix_user_saved_research_identity", "identity_id"),
        Index("ix_user_saved_research_unique", "identity_id", "research_id", unique=True),
    )


class UserSearchQuotaORM(Base):
    """Database model for tracking user's daily search quota."""

    __tablename__ = "user_search_quotas"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    searches_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_search_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    quota_resets_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
