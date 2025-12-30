"""SQLAlchemy ORM models for PROFILE module."""

from datetime import datetime, date, time

from sqlalchemy import (
    String, Integer, Float, Text, Boolean, DateTime, Date, Time,
    Enum as SQLEnum, JSON, Index
)
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin
from src.modules.profile.models import (
    Gender, UnitSystem, FastingProtocol, FitnessLevel,
    DietaryPreference, GoalType,
)


class UserProfileORM(Base, TimestampMixin):
    """Database model for user profiles."""

    __tablename__ = "user_profiles"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Personal info (PII)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Demographics
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(SQLEnum(Gender), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)


class UserGoalsORM(Base, TimestampMixin):
    """Database model for user goals."""

    __tablename__ = "user_goals"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Primary goals
    primary_goal: Mapped[GoalType] = mapped_column(
        SQLEnum(GoalType), default=GoalType.IMPROVE_FITNESS, nullable=False
    )
    secondary_goals: Mapped[str | None] = mapped_column(JSON, nullable=True)
    
    # Weight goals
    starting_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    # Body composition
    target_body_fat_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_muscle_mass_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Activity goals
    weekly_workout_goal: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    daily_step_goal: Mapped[int] = mapped_column(Integer, default=10000, nullable=False)
    weekly_fasting_goal: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    target_fasting_hours: Mapped[int] = mapped_column(Integer, default=16, nullable=False)


class HealthProfileORM(Base, TimestampMixin):
    """Database model for health information."""

    __tablename__ = "health_profiles"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Health conditions
    conditions: Mapped[str | None] = mapped_column(JSON, nullable=True)  # List of HealthCondition
    condition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Medications
    takes_medication: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    medication_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    medication_requires_food: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Doctor consultation
    doctor_approved_fasting: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    doctor_consultation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    # Emergency contact
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    
    # Safety flags
    fasting_safe: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_medical_disclaimer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DietaryProfileORM(Base, TimestampMixin):
    """Database model for dietary preferences."""

    __tablename__ = "dietary_profiles"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Primary diet
    dietary_preference: Mapped[DietaryPreference] = mapped_column(
        SQLEnum(DietaryPreference), default=DietaryPreference.NONE, nullable=False
    )
    
    # Allergies and intolerances
    allergies: Mapped[str | None] = mapped_column(JSON, nullable=True)
    intolerances: Mapped[str | None] = mapped_column(JSON, nullable=True)
    
    # Targets
    calories_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_target_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carbs_target_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fat_target_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Food preferences
    avoid_foods: Mapped[str | None] = mapped_column(JSON, nullable=True)
    favorite_foods: Mapped[str | None] = mapped_column(JSON, nullable=True)
    break_fast_preference: Mapped[str | None] = mapped_column(String(200), nullable=True)


class WorkoutRestrictionsORM(Base, TimestampMixin):
    """Database model for workout restrictions."""

    __tablename__ = "workout_restrictions"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Injuries
    injury_areas: Mapped[str | None] = mapped_column(JSON, nullable=True)
    injury_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Chronic conditions
    has_chronic_pain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    chronic_pain_areas: Mapped[str | None] = mapped_column(JSON, nullable=True)
    
    # Limitations
    avoid_high_impact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avoid_jumping: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avoid_heavy_weights: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avoid_floor_exercises: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Fitness level
    fitness_level: Mapped[FitnessLevel] = mapped_column(
        SQLEnum(FitnessLevel), default=FitnessLevel.BEGINNER, nullable=False
    )
    max_workout_duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    
    # Equipment
    has_gym_access: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    home_equipment: Mapped[str | None] = mapped_column(JSON, nullable=True)


class SocialProfileORM(Base, TimestampMixin):
    """Database model for social profile."""

    __tablename__ = "social_profiles"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Username and bio
    username: Mapped[str | None] = mapped_column(String(30), nullable=True, unique=True, index=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Friend code
    friend_code: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)
    
    # Privacy settings
    profile_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_streaks: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_achievements: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_level: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_workouts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_weight: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Social stats
    friends_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    followers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    following_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class UserPreferencesORM(Base, TimestampMixin):
    """Database model for user preferences."""

    __tablename__ = "user_preferences"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Display preferences
    unit_system: Mapped[UnitSystem] = mapped_column(
        SQLEnum(UnitSystem), default=UnitSystem.METRIC, nullable=False
    )
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    
    # Fasting preferences
    default_fasting_protocol: Mapped[FastingProtocol] = mapped_column(
        SQLEnum(FastingProtocol), default=FastingProtocol.SIXTEEN_EIGHT, nullable=False
    )
    custom_fast_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eating_window_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    eating_window_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    
    # Workout preferences
    preferred_workout_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    workout_reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    preferred_workout_types: Mapped[str | None] = mapped_column(JSON, nullable=True)
    
    # App preferences
    dark_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    haptic_feedback: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_effects: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class OnboardingStatusORM(Base, TimestampMixin):
    """Database model for onboarding progress."""

    __tablename__ = "onboarding_status"

    identity_id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # Profile steps
    basic_profile_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    goals_set: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    health_profile_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dietary_preferences_set: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    workout_restrictions_set: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bloodwork_uploaded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # First actions
    first_fast_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    first_workout_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    first_weight_logged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Overall
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    skipped_steps: Mapped[str | None] = mapped_column(JSON, nullable=True)
