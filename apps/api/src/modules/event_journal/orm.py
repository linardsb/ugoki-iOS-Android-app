"""
EVENT_JOURNAL Module - ORM Models

Database model for activity events.
This is an internal implementation detail - consumers use the interface.
"""

from datetime import datetime

from sqlalchemy import String, DateTime, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class ActivityEventORM(Base):
    """
    Database model for ActivityEvent.

    Events are immutable - no updated_at column.
    High-volume table - indexes optimized for common queries.
    """

    __tablename__ = "activity_events"

    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # Core event data (WHO, WHAT, WHEN)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Optional context
    related_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    related_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="api")
    event_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Immutable timestamp - events are never updated
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Indexes for common query patterns
    __table_args__ = (
        # Primary query: user's events ordered by time (activity feed)
        Index("ix_events_identity_timestamp", "identity_id", "timestamp"),
        # Filter by category (fasting events, workout events, etc.)
        Index("ix_events_identity_category", "identity_id", "category"),
        # Filter by event type (all fast_completed events)
        Index("ix_events_type", "event_type"),
        # Find events related to a specific resource
        Index("ix_events_related", "related_id"),
        # Analytics: events in a time range by category
        Index("ix_events_category_timestamp", "category", "timestamp"),
    )
