"""Pydantic models for PROFILE module."""

from datetime import datetime, date, time
from enum import Enum
from pydantic import BaseModel, Field, EmailStr
import secrets


class Gender(str, Enum):
    """Gender options."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class UnitSystem(str, Enum):
    """Unit system preference."""
    METRIC = "metric"      # kg, cm
    IMPERIAL = "imperial"  # lbs, inches


class FastingProtocol(str, Enum):
    """Default fasting protocol."""
    SIXTEEN_EIGHT = "16:8"
    EIGHTEEN_SIX = "18:6"
    TWENTY_FOUR = "24:0"
    CUSTOM = "custom"


class FitnessLevel(str, Enum):
    """User's fitness level."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class DietaryPreference(str, Enum):
    """Dietary preferences."""
    NONE = "none"
    KETO = "keto"
    LOW_CARB = "low_carb"
    VEGAN = "vegan"
    VEGETARIAN = "vegetarian"
    PALEO = "paleo"
    MEDITERRANEAN = "mediterranean"
    WHOLE30 = "whole30"


class HealthCondition(str, Enum):
    """Health conditions that may affect fasting."""
    DIABETES_TYPE1 = "diabetes_type1"
    DIABETES_TYPE2 = "diabetes_type2"
    HYPOGLYCEMIA = "hypoglycemia"
    EATING_DISORDER_HISTORY = "eating_disorder_history"
    PREGNANT = "pregnant"
    BREASTFEEDING = "breastfeeding"
    HEART_CONDITION = "heart_condition"
    KIDNEY_DISEASE = "kidney_disease"
    ON_MEDICATION = "on_medication"
    OTHER = "other"


class InjuryArea(str, Enum):
    """Body areas with potential injuries/restrictions."""
    NECK = "neck"
    SHOULDER = "shoulder"
    UPPER_BACK = "upper_back"
    LOWER_BACK = "lower_back"
    ELBOW = "elbow"
    WRIST = "wrist"
    HIP = "hip"
    KNEE = "knee"
    ANKLE = "ankle"
    OTHER = "other"


class GoalType(str, Enum):
    """Types of fitness goals."""
    WEIGHT_LOSS = "weight_loss"
    WEIGHT_GAIN = "weight_gain"
    MUSCLE_GAIN = "muscle_gain"
    MAINTAIN_WEIGHT = "maintain_weight"
    IMPROVE_FITNESS = "improve_fitness"
    INCREASE_ENERGY = "increase_energy"
    BETTER_SLEEP = "better_sleep"
    REDUCE_STRESS = "reduce_stress"


# =========================================================================
# Core Profile
# =========================================================================

class UserProfile(BaseModel):
    """User's personal profile with PII."""
    identity_id: str
    
    # Personal info (PII)
    email: EmailStr | None = None
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    
    # Demographics
    date_of_birth: date | None = None
    gender: Gender | None = None
    height_cm: float | None = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    @property
    def age(self) -> int | None:
        """Calculate age from date of birth."""
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )


# =========================================================================
# Goals
# =========================================================================

class UserGoals(BaseModel):
    """User's fitness and wellness goals."""
    identity_id: str
    
    # Primary goals
    primary_goal: GoalType = GoalType.IMPROVE_FITNESS
    secondary_goals: list[GoalType] = []
    
    # Weight goals
    starting_weight_kg: float | None = None
    target_weight_kg: float | None = None
    target_date: date | None = None
    
    # Body composition goals
    target_body_fat_percent: float | None = None
    target_muscle_mass_kg: float | None = None
    
    # Activity goals
    weekly_workout_goal: int = Field(3, ge=1, le=7)
    daily_step_goal: int = Field(10000, ge=1000, le=50000)
    weekly_fasting_goal: int = Field(5, ge=1, le=7)  # Days per week
    
    # Fasting goals
    target_fasting_hours: int = Field(16, ge=12, le=72)
    
    created_at: datetime
    updated_at: datetime


# =========================================================================
# Health & Safety
# =========================================================================

class HealthProfile(BaseModel):
    """Health conditions and safety information."""
    identity_id: str
    
    # Health conditions (affects fasting recommendations)
    conditions: list[HealthCondition] = []
    condition_notes: str | None = None  # Free text for "other" or details
    
    # Medications
    takes_medication: bool = False
    medication_notes: str | None = None
    medication_requires_food: bool = False  # Important for fasting
    
    # Doctor consultation
    doctor_approved_fasting: bool | None = None
    doctor_consultation_date: date | None = None
    
    # Emergency contact (optional)
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    
    # Flags
    fasting_safe: bool = True  # Computed based on conditions
    requires_medical_disclaimer: bool = False
    
    created_at: datetime
    updated_at: datetime


# =========================================================================
# Dietary Preferences
# =========================================================================

class DietaryProfile(BaseModel):
    """Dietary preferences and restrictions."""
    identity_id: str
    
    # Primary diet
    dietary_preference: DietaryPreference = DietaryPreference.NONE
    
    # Allergies and intolerances
    allergies: list[str] = []  # e.g., ["peanuts", "shellfish"]
    intolerances: list[str] = []  # e.g., ["lactose", "gluten"]
    
    # Preferences
    calories_target: int | None = None
    protein_target_g: int | None = None
    carbs_target_g: int | None = None
    fat_target_g: int | None = None
    
    # Restrictions
    avoid_foods: list[str] = []
    favorite_foods: list[str] = []
    
    # Fasting-specific
    break_fast_preference: str | None = None  # What they like to eat first
    
    created_at: datetime
    updated_at: datetime


# =========================================================================
# Workout Restrictions
# =========================================================================

class WorkoutRestrictions(BaseModel):
    """Injuries and workout limitations."""
    identity_id: str
    
    # Current injuries
    injury_areas: list[InjuryArea] = []
    injury_notes: str | None = None
    
    # Chronic conditions
    has_chronic_pain: bool = False
    chronic_pain_areas: list[InjuryArea] = []
    
    # Limitations
    avoid_high_impact: bool = False
    avoid_jumping: bool = False
    avoid_heavy_weights: bool = False
    avoid_floor_exercises: bool = False
    
    # Fitness level
    fitness_level: FitnessLevel = FitnessLevel.BEGINNER
    max_workout_duration_minutes: int = Field(30, ge=5, le=120)
    
    # Equipment available
    has_gym_access: bool = False
    home_equipment: list[str] = []  # ["dumbbells", "resistance_bands", "mat"]
    
    created_at: datetime
    updated_at: datetime


# =========================================================================
# Social Profile
# =========================================================================

class SocialProfile(BaseModel):
    """Social and community features."""
    identity_id: str
    
    # Username (unique, for social features)
    username: str | None = None
    bio: str | None = Field(None, max_length=500)
    
    # Friend code (for easy adding)
    friend_code: str = Field(default_factory=lambda: secrets.token_hex(4).upper())
    
    # Privacy settings
    profile_public: bool = False
    show_streaks: bool = True
    show_achievements: bool = True
    show_level: bool = True
    show_workouts: bool = False
    show_weight: bool = False
    
    # Social stats (computed)
    friends_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    
    created_at: datetime
    updated_at: datetime


# =========================================================================
# Preferences
# =========================================================================

class UserPreferences(BaseModel):
    """User preferences and settings."""
    identity_id: str
    
    # Display preferences
    unit_system: UnitSystem = UnitSystem.METRIC
    timezone: str = "UTC"
    language: str = "en"
    
    # Fasting preferences
    default_fasting_protocol: FastingProtocol = FastingProtocol.SIXTEEN_EIGHT
    custom_fast_hours: int | None = None
    eating_window_start: time | None = None
    eating_window_end: time | None = None
    
    # Workout preferences
    preferred_workout_time: time | None = None
    workout_reminder_enabled: bool = True
    preferred_workout_types: list[str] = []
    
    # App preferences
    dark_mode: bool = False
    haptic_feedback: bool = True
    sound_effects: bool = True
    
    created_at: datetime
    updated_at: datetime


# =========================================================================
# GDPR & Onboarding
# =========================================================================

class GDPRExport(BaseModel):
    """GDPR data export structure."""
    exported_at: datetime
    identity_id: str
    profile: UserProfile | None = None
    preferences: UserPreferences | None = None
    goals: UserGoals | None = None
    health: HealthProfile | None = None
    dietary: DietaryProfile | None = None
    workout_restrictions: WorkoutRestrictions | None = None
    social: SocialProfile | None = None
    # Other modules would add their data here
    metrics: list[dict] = []
    workouts: list[dict] = []
    fasting_history: list[dict] = []
    achievements: list[dict] = []


class OnboardingStatus(BaseModel):
    """User onboarding progress."""
    identity_id: str

    # Profile steps
    basic_profile_completed: bool = False
    goals_set: bool = False
    health_profile_completed: bool = False
    dietary_preferences_set: bool = False
    workout_restrictions_set: bool = False
    bloodwork_uploaded: bool = False

    # First actions
    first_fast_completed: bool = False
    first_workout_completed: bool = False
    first_weight_logged: bool = False

    # Overall
    onboarding_completed: bool = False
    completed_at: datetime | None = None
    skipped_steps: list[str] = []


class CompleteProfile(BaseModel):
    """Complete user profile with all sections."""
    profile: UserProfile
    preferences: UserPreferences
    goals: UserGoals | None = None
    health: HealthProfile | None = None
    dietary: DietaryProfile | None = None
    workout_restrictions: WorkoutRestrictions | None = None
    social: SocialProfile | None = None
    onboarding: OnboardingStatus


# =========================================================================
# Request/Response Models
# =========================================================================

class CreateProfileRequest(BaseModel):
    """Request to create a profile."""
    email: EmailStr | None = None
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class UpdateProfileRequest(BaseModel):
    """Request to update profile."""
    email: EmailStr | None = None
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    height_cm: float | None = None


class UpdateGoalsRequest(BaseModel):
    """Request to update goals."""
    primary_goal: GoalType | None = None
    secondary_goals: list[GoalType] | None = None
    starting_weight_kg: float | None = None
    target_weight_kg: float | None = None
    target_date: date | None = None
    target_body_fat_percent: float | None = None
    weekly_workout_goal: int | None = Field(None, ge=1, le=7)
    daily_step_goal: int | None = Field(None, ge=1000, le=50000)
    weekly_fasting_goal: int | None = Field(None, ge=1, le=7)
    target_fasting_hours: int | None = Field(None, ge=12, le=72)


class UpdateHealthRequest(BaseModel):
    """Request to update health profile."""
    conditions: list[HealthCondition] | None = None
    condition_notes: str | None = None
    takes_medication: bool | None = None
    medication_notes: str | None = None
    medication_requires_food: bool | None = None
    doctor_approved_fasting: bool | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


class UpdateDietaryRequest(BaseModel):
    """Request to update dietary preferences."""
    dietary_preference: DietaryPreference | None = None
    allergies: list[str] | None = None
    intolerances: list[str] | None = None
    calories_target: int | None = None
    protein_target_g: int | None = None
    carbs_target_g: int | None = None
    fat_target_g: int | None = None
    avoid_foods: list[str] | None = None
    favorite_foods: list[str] | None = None
    break_fast_preference: str | None = None


class UpdateWorkoutRestrictionsRequest(BaseModel):
    """Request to update workout restrictions."""
    injury_areas: list[InjuryArea] | None = None
    injury_notes: str | None = None
    has_chronic_pain: bool | None = None
    chronic_pain_areas: list[InjuryArea] | None = None
    avoid_high_impact: bool | None = None
    avoid_jumping: bool | None = None
    avoid_heavy_weights: bool | None = None
    avoid_floor_exercises: bool | None = None
    fitness_level: FitnessLevel | None = None
    max_workout_duration_minutes: int | None = Field(None, ge=5, le=120)
    has_gym_access: bool | None = None
    home_equipment: list[str] | None = None


class UpdateSocialRequest(BaseModel):
    """Request to update social profile."""
    username: str | None = Field(None, min_length=3, max_length=30)
    bio: str | None = Field(None, max_length=500)
    profile_public: bool | None = None
    show_streaks: bool | None = None
    show_achievements: bool | None = None
    show_level: bool | None = None
    show_workouts: bool | None = None
    show_weight: bool | None = None


class UpdatePreferencesRequest(BaseModel):
    """Request to update preferences."""
    unit_system: UnitSystem | None = None
    timezone: str | None = None
    language: str | None = None
    default_fasting_protocol: FastingProtocol | None = None
    custom_fast_hours: int | None = None
    eating_window_start: time | None = None
    eating_window_end: time | None = None
    preferred_workout_time: time | None = None
    workout_reminder_enabled: bool | None = None
    preferred_workout_types: list[str] | None = None
    dark_mode: bool | None = None
    haptic_feedback: bool | None = None
    sound_effects: bool | None = None
