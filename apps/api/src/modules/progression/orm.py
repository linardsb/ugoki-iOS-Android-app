from datetime import datetime, date

from sqlalchemy import String, Integer, Date, DateTime, Text, Boolean, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin
from src.modules.progression.models import StreakType, XPTransactionType, AchievementType


class StreakORM(Base, TimestampMixin):
    """Database model for Streak tracking."""

    __tablename__ = "streaks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    streak_type: Mapped[StreakType] = mapped_column(
        SQLEnum(StreakType), nullable=False
    )
    current_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index("ix_streaks_identity_type", "identity_id", "streak_type", unique=True),
    )


class XPTransactionORM(Base):
    """Database model for XP transactions."""

    __tablename__ = "xp_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[XPTransactionType] = mapped_column(
        SQLEnum(XPTransactionType), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    related_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    __table_args__ = (
        Index("ix_xp_transactions_identity_created", "identity_id", "created_at"),
    )


class UserLevelORM(Base, TimestampMixin):
    """Database model for user level/XP state."""

    __tablename__ = "user_levels"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    current_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class AchievementORM(Base):
    """Database model for achievement definitions."""

    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    achievement_type: Mapped[AchievementType] = mapped_column(
        SQLEnum(AchievementType), nullable=False, index=True
    )
    xp_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    requirement_value: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class UserAchievementORM(Base):
    """Database model for user achievement progress."""

    __tablename__ = "user_achievements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    achievement_id: Mapped[str] = mapped_column(String(36), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index("ix_user_achievements_identity_achievement", "identity_id", "achievement_id", unique=True),
    )
