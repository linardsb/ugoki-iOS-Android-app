from datetime import datetime, date
from sqlalchemy import (
    String,
    Boolean,
    Float,
    Integer,
    Date,
    DateTime,
    Text,
    ForeignKey,
    Index,
    CheckConstraint,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin
from src.modules.social.models import FriendshipStatus, ChallengeType, ChallengeStatus


class FriendshipORM(Base, TimestampMixin):
    """Friendship relationships between users (bidirectional)."""

    __tablename__ = "friendships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Always store with identity_id_a < identity_id_b lexicographically
    identity_id_a: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    identity_id_b: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    status: Mapped[FriendshipStatus] = mapped_column(
        SQLEnum(FriendshipStatus), nullable=False, default=FriendshipStatus.PENDING
    )
    requested_by: Mapped[str] = mapped_column(String(36), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_friendships_a_status", "identity_id_a", "status"),
        Index("ix_friendships_b_status", "identity_id_b", "status"),
        Index("ix_friendships_pair", "identity_id_a", "identity_id_b", unique=True),
        CheckConstraint("identity_id_a < identity_id_b", name="chk_friendship_order"),
    )


class FollowORM(Base):
    """Follow relationships (one-way)."""

    __tablename__ = "follows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    follower_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    following_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_follows_pair", "follower_id", "following_id", unique=True),
    )


class ChallengeORM(Base, TimestampMixin):
    """Group challenges/competitions."""

    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenge_type: Mapped[ChallengeType] = mapped_column(
        SQLEnum(ChallengeType), nullable=False
    )
    goal_value: Mapped[float] = mapped_column(Float, nullable=False)
    goal_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    join_code: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=50)

    __table_args__ = (
        Index("ix_challenges_dates", "start_date", "end_date"),
        Index("ix_challenges_type", "challenge_type"),
    )


class ChallengeParticipantORM(Base):
    """Challenge participants and their progress."""

    __tablename__ = "challenge_participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    challenge_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    current_progress: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_participants_challenge_identity", "challenge_id", "identity_id", unique=True),
        Index("ix_participants_progress", "challenge_id", "current_progress"),
    )
