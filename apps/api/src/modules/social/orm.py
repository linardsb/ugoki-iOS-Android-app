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
from src.modules.social.models import (
    FriendshipStatus,
    ChallengeType,
    ChallengeStatus,
    DuoStreakType,
    DuoStreakInviteStatus,
)


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
    # Team challenge fields (Sprint 3)
    is_team_challenge: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    team_size_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_size_max: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_challenges_dates", "start_date", "end_date"),
        Index("ix_challenges_type", "challenge_type"),
    )


class ChallengeTeamORM(Base):
    """Teams within a team challenge."""

    __tablename__ = "challenge_teams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    challenge_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    join_code: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)
    total_progress: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    member_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_challenge_teams_challenge_name", "challenge_id", "name", unique=True),
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
    # Team assignment (Sprint 3)
    team_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("challenge_teams.id", ondelete="SET NULL"), nullable=True, index=True
    )

    __table_args__ = (
        Index("ix_participants_challenge_identity", "challenge_id", "identity_id", unique=True),
        Index("ix_participants_progress", "challenge_id", "current_progress"),
    )


# =========================================================================
# Duo Streaks
# =========================================================================

class DuoStreakORM(Base, TimestampMixin):
    """Shared streak between two users - both must complete daily to maintain."""

    __tablename__ = "duo_streaks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Always store with identity_id_a < identity_id_b (same pattern as friendships)
    identity_id_a: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    identity_id_b: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    streak_type: Mapped[DuoStreakType] = mapped_column(
        SQLEnum(DuoStreakType), nullable=False
    )
    current_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_mutual_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_duo_streaks_pair", "identity_id_a", "identity_id_b", "streak_type", unique=True),
        CheckConstraint("identity_id_a < identity_id_b", name="chk_duo_streak_order"),
    )


class DuoStreakDailyORM(Base):
    """Daily completion tracking for duo streaks."""

    __tablename__ = "duo_streak_daily"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    duo_streak_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("duo_streaks.id", ondelete="CASCADE"), nullable=False
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    identity_id_a_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    identity_id_b_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    both_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_duo_streak_daily_lookup", "duo_streak_id", "activity_date", unique=True),
    )


class DuoStreakInviteORM(Base):
    """Pending duo streak invitations."""

    __tablename__ = "duo_streak_invites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    from_identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    to_identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    streak_type: Mapped[DuoStreakType] = mapped_column(
        SQLEnum(DuoStreakType), nullable=False
    )
    status: Mapped[DuoStreakInviteStatus] = mapped_column(
        SQLEnum(DuoStreakInviteStatus), nullable=False, default=DuoStreakInviteStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_duo_streak_invites_pending", "to_identity_id", "status"),
    )


class DuoStreakMilestoneORM(Base):
    """Milestones reached in duo streaks (for tracking and rewards)."""

    __tablename__ = "duo_streak_milestones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    duo_streak_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("duo_streaks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_days: Mapped[int] = mapped_column(Integer, nullable=False)
    reached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    xp_awarded_a: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    xp_awarded_b: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("ix_duo_streak_milestones_unique", "duo_streak_id", "milestone_days", unique=True),
    )


# =========================================================================
# Activity Feed
# =========================================================================

class FeedItemORM(Base):
    """Activity feed items (denormalized for fast reads)."""

    __tablename__ = "feed_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Note: 'metadata' is reserved in SQLAlchemy, using 'item_metadata' instead
    item_metadata: Mapped[str | None] = mapped_column("metadata", Text, nullable=True)  # JSON stored as text
    cheer_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Denormalized user data for fast display
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        Index("ix_feed_items_identity_created", "identity_id", "created_at"),
        Index("ix_feed_items_type", "activity_type"),
    )


class FeedCheerORM(Base):
    """Cheers on feed items."""

    __tablename__ = "feed_cheers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    feed_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("feed_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_feed_cheers_unique", "feed_item_id", "identity_id", unique=True),
    )


class FeedPreferencesORM(Base):
    """User's feed sharing preferences."""

    __tablename__ = "feed_preferences"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    share_fasts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_workouts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_achievements: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_level_ups: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_streaks: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_duo_streaks: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# =========================================================================
# Challenge Templates
# =========================================================================

class ChallengeTemplateORM(Base):
    """Pre-built challenge templates for quick challenge creation."""

    __tablename__ = "challenge_templates"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Store as string to avoid enum conflicts across migrations
    challenge_type: Mapped[str] = mapped_column(String(50), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    goal_value: Mapped[float] = mapped_column(Float, nullable=False)
    goal_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_challenge_templates_active", "is_active", "sort_order"),
    )


# =========================================================================
# Achievement Celebrations (Sprint 2)
# =========================================================================

class AchievementCelebrationORM(Base):
    """Celebrations of friends' achievements - both users earn XP."""

    __tablename__ = "achievement_celebrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_achievement_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user_achievements.id", ondelete="CASCADE"), nullable=False, index=True
    )
    celebrator_identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    xp_awarded_achiever: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    xp_awarded_celebrator: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("ix_achievement_celebrations_unique", "user_achievement_id", "celebrator_identity_id", unique=True),
    )
