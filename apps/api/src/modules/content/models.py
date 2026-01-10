"""Pydantic models for CONTENT module."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class DifficultyLevel(str, Enum):
    """Workout difficulty levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class WorkoutType(str, Enum):
    """Types of workouts."""
    HIIT = "hiit"
    STRENGTH = "strength"
    CARDIO = "cardio"
    FLEXIBILITY = "flexibility"
    RECOVERY = "recovery"


class SessionStatus(str, Enum):
    """Workout session status."""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class BodyFocus(str, Enum):
    """Body focus for exercises."""
    UPPER_BODY = "upper_body"
    LOWER_BODY = "lower_body"
    FULL_BODY = "full_body"
    CORE = "core"


class WorkoutCategory(BaseModel):
    """A category for organizing workouts."""
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None  # Hex color for UI
    workout_count: int = 0


class Exercise(BaseModel):
    """An individual exercise within a workout."""
    id: str
    name: str
    description: str | None = None
    duration_seconds: int = Field(..., gt=0, description="Duration in seconds")
    rest_seconds: int = Field(0, ge=0, description="Rest after exercise")
    video_url: str | None = None
    thumbnail_url: str | None = None
    calories_per_minute: float = Field(5.0, gt=0)
    order: int = Field(0, ge=0, description="Order in workout")
    body_focus: BodyFocus | None = None
    difficulty: DifficultyLevel | None = None
    equipment_required: bool = False


class Workout(BaseModel):
    """A complete workout with metadata."""
    id: str
    name: str
    description: str | None = None
    workout_type: WorkoutType
    difficulty: DifficultyLevel
    duration_minutes: int = Field(..., gt=0)
    calories_estimate: int = Field(0, ge=0)
    thumbnail_url: str | None = None
    video_url: str | None = None  # Full workout video if available
    category_id: str | None = None
    category: WorkoutCategory | None = None
    exercises: list[Exercise] = []
    equipment_needed: list[str] = []
    is_featured: bool = False
    is_premium: bool = False
    times_completed: int = 0  # Global completion count
    average_rating: float | None = None
    created_at: datetime
    updated_at: datetime


class WorkoutSession(BaseModel):
    """A user's workout session."""
    id: str
    identity_id: str
    workout_id: str
    workout: Workout | None = None
    status: SessionStatus
    started_at: datetime
    completed_at: datetime | None = None
    duration_seconds: int | None = None
    calories_burned: int | None = None
    xp_earned: int = 0


class WorkoutRecommendation(BaseModel):
    """A recommended workout with reason."""
    workout: Workout
    reason: str
    score: float = Field(0.0, ge=0, le=1.0, description="Relevance score")


# Request/Response models
class WorkoutFilter(BaseModel):
    """Filters for listing workouts."""
    workout_type: WorkoutType | None = None
    difficulty: DifficultyLevel | None = None
    category_id: str | None = None
    body_focus: BodyFocus | None = None
    min_duration: int | None = None
    max_duration: int | None = None
    is_featured: bool | None = None
    search: str | None = None


class ExerciseFilter(BaseModel):
    """Filters for listing exercises."""
    body_focus: BodyFocus | None = None
    difficulty: DifficultyLevel | None = None
    equipment_required: bool | None = None
    search: str | None = None


class StartWorkoutRequest(BaseModel):
    """Request to start a workout."""
    workout_id: str


class CompleteWorkoutRequest(BaseModel):
    """Request to complete a workout."""
    calories_burned: int | None = None


class WorkoutStats(BaseModel):
    """User's workout statistics."""
    total_workouts: int = 0
    total_duration_minutes: int = 0
    total_calories_burned: int = 0
    favorite_workout_type: WorkoutType | None = None
    current_week_workouts: int = 0
    average_workout_duration: float = 0.0


# ============== RECIPES ==============

class MealType(str, Enum):
    """Types of meals."""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class DietTag(str, Enum):
    """Dietary tags for recipes."""
    HIGH_PROTEIN = "high_protein"
    LOW_CARB = "low_carb"
    KETO = "keto"
    VEGAN = "vegan"
    VEGETARIAN = "vegetarian"
    GLUTEN_FREE = "gluten_free"
    DAIRY_FREE = "dairy_free"
    PALEO = "paleo"
    MEDITERRANEAN = "mediterranean"
    MEAL_PREP = "meal_prep"
    QUICK = "quick"
    POST_WORKOUT = "post_workout"


class NutritionInfo(BaseModel):
    """Nutritional information for a recipe."""
    calories: int = Field(..., ge=0, description="Calories per serving")
    protein_g: int = Field(..., ge=0, description="Protein in grams")
    carbs_g: int = Field(..., ge=0, description="Carbohydrates in grams")
    fat_g: int = Field(..., ge=0, description="Fat in grams")
    fiber_g: int | None = Field(None, ge=0, description="Fiber in grams")
    sugar_g: int | None = Field(None, ge=0, description="Sugar in grams")


class Ingredient(BaseModel):
    """An ingredient in a recipe."""
    name: str
    amount: str  # e.g., "1 cup", "200g", "2 tbsp"
    notes: str | None = None  # e.g., "chopped", "optional"


class RecipeCategory(BaseModel):
    """A category for organizing recipes."""
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    recipe_count: int = 0


class Recipe(BaseModel):
    """A complete recipe with all details."""
    id: str
    name: str
    description: str | None = None
    meal_type: MealType
    prep_time_minutes: int = Field(..., gt=0, description="Preparation time in minutes")
    cook_time_minutes: int = Field(0, ge=0, description="Cooking time in minutes")
    servings: int = Field(1, gt=0, description="Number of servings")
    nutrition: NutritionInfo
    ingredients: list[Ingredient] = []
    instructions: list[str] = []  # Step-by-step instructions
    diet_tags: list[DietTag] = []
    image_url: str | None = None
    is_featured: bool = False
    times_saved: int = 0
    average_rating: float | None = None
    created_at: datetime
    updated_at: datetime


class RecipeSummary(BaseModel):
    """Simplified recipe for list views."""
    id: str
    name: str
    meal_type: MealType
    prep_time_minutes: int
    calories: int
    protein_g: int
    diet_tags: list[DietTag] = []
    image_url: str | None = None
    is_featured: bool = False
    is_saved: bool = False  # Whether current user has saved it


class UserSavedRecipe(BaseModel):
    """A user's saved recipe."""
    id: str
    identity_id: str
    recipe_id: str
    recipe: Recipe | None = None
    saved_at: datetime


class RecipeFilter(BaseModel):
    """Filters for listing recipes."""
    meal_type: MealType | None = None
    diet_tags: list[DietTag] | None = None
    max_prep_time: int | None = None
    max_calories: int | None = None
    min_protein: int | None = None
    is_featured: bool | None = None
    search: str | None = None


class SaveRecipeRequest(BaseModel):
    """Request to save a recipe."""
    recipe_id: str
