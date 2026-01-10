"""SQLAlchemy ORM models for CONTENT module."""

from datetime import datetime

from sqlalchemy import (
    String, Integer, Float, Text, Boolean, DateTime,
    Enum as SQLEnum, ForeignKey, Index, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin
from src.modules.content.models import DifficultyLevel, WorkoutType, SessionStatus, MealType, BodyFocus


class WorkoutCategoryORM(Base, TimestampMixin):
    """Database model for workout categories."""

    __tablename__ = "workout_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)  # #RRGGBB

    # Relationships
    workouts: Mapped[list["WorkoutORM"]] = relationship(back_populates="category")


class WorkoutORM(Base, TimestampMixin):
    """Database model for workouts."""

    __tablename__ = "workouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    workout_type: Mapped[WorkoutType] = mapped_column(
        SQLEnum(WorkoutType), nullable=False, index=True
    )
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        SQLEnum(DifficultyLevel), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    calories_estimate: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("workout_categories.id"), nullable=True
    )
    equipment_needed: Mapped[str | None] = mapped_column(JSON, nullable=True)  # JSON array
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    times_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    category: Mapped[WorkoutCategoryORM | None] = relationship(back_populates="workouts")
    exercises: Mapped[list["ExerciseORM"]] = relationship(
        back_populates="workout", order_by="ExerciseORM.order"
    )
    sessions: Mapped[list["WorkoutSessionORM"]] = relationship(back_populates="workout")

    __table_args__ = (
        Index("ix_workouts_featured", "is_featured"),
        Index("ix_workouts_type_difficulty", "workout_type", "difficulty"),
    )


class ExerciseORM(Base):
    """Database model for exercises within a workout."""

    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workout_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workouts.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    calories_per_minute: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    body_focus: Mapped[BodyFocus | None] = mapped_column(
        SQLEnum(BodyFocus), nullable=True
    )
    difficulty: Mapped[DifficultyLevel | None] = mapped_column(
        SQLEnum(DifficultyLevel), nullable=True
    )
    equipment_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    workout: Mapped[WorkoutORM] = relationship(back_populates="exercises")

    __table_args__ = (
        Index("ix_exercises_workout", "workout_id"),
        Index("ix_exercises_body_focus", "body_focus"),
        Index("ix_exercises_difficulty", "difficulty"),
    )


class WorkoutSessionORM(Base):
    """Database model for user workout sessions."""

    __tablename__ = "workout_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    workout_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workouts.id"), nullable=False
    )
    status: Mapped[SessionStatus] = mapped_column(
        SQLEnum(SessionStatus), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    workout: Mapped[WorkoutORM] = relationship(back_populates="sessions")

    __table_args__ = (
        Index("ix_workout_sessions_identity_status", "identity_id", "status"),
        Index("ix_workout_sessions_identity_started", "identity_id", "started_at"),
    )


# ============== RECIPES ==============

class RecipeORM(Base, TimestampMixin):
    """Database model for recipes."""

    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    meal_type: Mapped[MealType] = mapped_column(
        SQLEnum(MealType), nullable=False
    )  # Index defined in __table_args__
    prep_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    cook_time_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    servings: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Nutrition (stored as individual columns for filtering)
    calories: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g: Mapped[int] = mapped_column(Integer, nullable=False)
    carbs_g: Mapped[int] = mapped_column(Integer, nullable=False)
    fat_g: Mapped[int] = mapped_column(Integer, nullable=False)
    fiber_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sugar_g: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # JSON fields for complex data
    ingredients: Mapped[str | None] = mapped_column(JSON, nullable=True)  # List of Ingredient objects
    instructions: Mapped[str | None] = mapped_column(JSON, nullable=True)  # List of strings
    diet_tags: Mapped[str | None] = mapped_column(JSON, nullable=True)  # List of DietTag values

    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    times_saved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    saved_by: Mapped[list["UserSavedRecipeORM"]] = relationship(back_populates="recipe")

    __table_args__ = (
        Index("ix_recipes_meal_type", "meal_type"),
        Index("ix_recipes_featured", "is_featured"),
        Index("ix_recipes_calories", "calories"),
        Index("ix_recipes_protein", "protein_g"),
    )


class UserSavedRecipeORM(Base):
    """Database model for user's saved recipes."""

    __tablename__ = "user_saved_recipes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    recipe_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("recipes.id"), nullable=False
    )
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    recipe: Mapped[RecipeORM] = relationship(back_populates="saved_by")

    __table_args__ = (
        Index("ix_user_saved_recipes_identity", "identity_id"),
        Index("ix_user_saved_recipes_unique", "identity_id", "recipe_id", unique=True),
    )
