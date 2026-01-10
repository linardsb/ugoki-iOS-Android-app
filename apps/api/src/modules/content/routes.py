"""FastAPI routes for CONTENT module."""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.content.models import (
    Workout,
    Exercise,
    WorkoutCategory,
    WorkoutSession,
    WorkoutFilter,
    ExerciseFilter,
    WorkoutRecommendation,
    WorkoutStats,
    WorkoutType,
    DifficultyLevel,
    BodyFocus,
    StartWorkoutRequest,
    CompleteWorkoutRequest,
    Recipe,
    RecipeSummary,
    RecipeFilter,
    MealType,
    DietTag,
    UserSavedRecipe,
    SaveRecipeRequest,
)
from src.modules.content.service import ContentService
from src.modules.event_journal.service import EventJournalService
from src.modules.progression.service import ProgressionService
from src.modules.progression.models import StreakType
from src.modules.social.service import SocialService

router = APIRouter(tags=["content"])


def get_event_journal_service(db: AsyncSession = Depends(get_db)) -> EventJournalService:
    return EventJournalService(db)


def get_progression_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> ProgressionService:
    return ProgressionService(db, event_journal=event_journal)


def get_content_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> ContentService:
    return ContentService(db, event_journal=event_journal)


def get_social_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> SocialService:
    return SocialService(db, event_journal=event_journal)


# =========================================================================
# Categories
# =========================================================================

@router.get("/categories", response_model=list[WorkoutCategory])
async def list_categories(
    service: ContentService = Depends(get_content_service),
) -> list[WorkoutCategory]:
    """Get all workout categories."""
    return await service.list_categories()


@router.get("/categories/{category_id}", response_model=WorkoutCategory)
async def get_category(
    category_id: str,
    service: ContentService = Depends(get_content_service),
) -> WorkoutCategory:
    """Get a specific category."""
    category = await service.get_category(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


# =========================================================================
# Workouts
# =========================================================================

@router.get("/workouts", response_model=list[Workout])
async def list_workouts(
    workout_type: WorkoutType | None = None,
    difficulty: DifficultyLevel | None = None,
    category_id: str | None = None,
    min_duration: int | None = Query(None, ge=1),
    max_duration: int | None = Query(None, ge=1),
    is_featured: bool | None = None,
    search: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ContentService = Depends(get_content_service),
) -> list[Workout]:
    """
    List workouts with optional filtering.
    
    Filters:
    - workout_type: hiit, strength, cardio, flexibility, recovery
    - difficulty: beginner, intermediate, advanced
    - category_id: Filter by category
    - min_duration/max_duration: Duration range in minutes
    - is_featured: Featured workouts only
    - search: Search in name and description
    """
    filters = WorkoutFilter(
        workout_type=workout_type,
        difficulty=difficulty,
        category_id=category_id,
        min_duration=min_duration,
        max_duration=max_duration,
        is_featured=is_featured,
        search=search,
    )
    return await service.list_workouts(filters, limit, offset)


@router.get("/workouts/{workout_id}", response_model=Workout)
async def get_workout(
    workout_id: str,
    include_exercises: bool = Query(False),
    service: ContentService = Depends(get_content_service),
) -> Workout:
    """Get a specific workout."""
    if include_exercises:
        workout = await service.get_workout_with_exercises(workout_id)
    else:
        workout = await service.get_workout(workout_id)
    
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


# =========================================================================
# Exercises
# =========================================================================

@router.get("/exercises", response_model=list[Exercise])
async def list_exercises(
    body_focus: BodyFocus | None = None,
    difficulty: DifficultyLevel | None = None,
    equipment_required: bool | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: ContentService = Depends(get_content_service),
) -> list[Exercise]:
    """
    List unique exercises with optional filtering.

    Filters:
    - body_focus: upper_body, lower_body, full_body, core
    - difficulty: beginner, intermediate, advanced
    - equipment_required: true/false
    - search: Search in name and description
    """
    filters = ExerciseFilter(
        body_focus=body_focus,
        difficulty=difficulty,
        equipment_required=equipment_required,
        search=search,
    )
    return await service.list_exercises(filters, limit, offset)


# =========================================================================
# Workout Sessions
# =========================================================================

@router.post("/sessions", response_model=WorkoutSession, status_code=status.HTTP_201_CREATED)
async def start_workout(
    identity_id: str,  # TODO: Extract from JWT
    request: StartWorkoutRequest,
    service: ContentService = Depends(get_content_service),
) -> WorkoutSession:
    """
    Start a workout session.
    
    If there's an existing active session, it will be abandoned.
    """
    try:
        return await service.start_workout(identity_id, request.workout_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/active", response_model=WorkoutSession | None)
async def get_active_session(
    identity_id: str,  # TODO: Extract from JWT
    service: ContentService = Depends(get_content_service),
) -> WorkoutSession | None:
    """Get the user's currently active workout session."""
    return await service.get_active_session(identity_id)


@router.post("/sessions/{session_id}/complete", response_model=WorkoutSession)
async def complete_workout(
    session_id: str,
    request: CompleteWorkoutRequest | None = None,
    db: AsyncSession = Depends(get_db),
    service: ContentService = Depends(get_content_service),
    progression: ProgressionService = Depends(get_progression_service),
    social: SocialService = Depends(get_social_service),
) -> WorkoutSession:
    """
    Complete a workout session.

    Optionally provide actual calories burned.
    Returns the completed session with XP earned.
    Also updates the user's workout streak and challenge progress.
    """
    try:
        calories = request.calories_burned if request else None
        session = await service.complete_workout(session_id, calories)

        # Update workout streak
        await progression.record_activity(
            identity_id=session.identity_id,
            streak_type=StreakType.WORKOUT,
        )

        # Update challenge progress for any active challenges
        await social.update_challenge_progress(session.identity_id)

        # Ensure changes are committed before returning
        await db.commit()

        return session
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/abandon", response_model=WorkoutSession)
async def abandon_workout(
    session_id: str,
    service: ContentService = Depends(get_content_service),
) -> WorkoutSession:
    """Abandon a workout session."""
    try:
        return await service.abandon_workout(session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/history", response_model=list[WorkoutSession])
async def get_workout_history(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ContentService = Depends(get_content_service),
) -> list[WorkoutSession]:
    """Get user's workout history."""
    return await service.get_workout_history(identity_id, limit, offset)


# =========================================================================
# Recommendations & Stats
# =========================================================================

@router.get("/recommendations", response_model=list[WorkoutRecommendation])
async def get_recommendations(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(5, ge=1, le=10),
    service: ContentService = Depends(get_content_service),
) -> list[WorkoutRecommendation]:
    """
    Get personalized workout recommendations.
    
    Based on:
    - Featured workouts
    - User's favorite workout types
    - Unexplored workout types
    - Popular workouts
    """
    return await service.get_recommendations(identity_id, limit)


@router.get("/stats", response_model=WorkoutStats)
async def get_workout_stats(
    identity_id: str,  # TODO: Extract from JWT
    service: ContentService = Depends(get_content_service),
) -> dict:
    """
    Get user's workout statistics.

    Includes:
    - Total workouts completed
    - Total duration and calories
    - Favorite workout type
    - This week's workout count
    """
    return await service.get_workout_stats(identity_id)


# =========================================================================
# Recipes
# =========================================================================

@router.get("/recipes", response_model=list[RecipeSummary])
async def list_recipes(
    identity_id: str | None = None,  # Optional for showing saved status
    meal_type: MealType | None = None,
    diet_tags: list[DietTag] | None = Query(None),
    max_prep_time: int | None = Query(None, ge=1),
    max_calories: int | None = Query(None, ge=1),
    min_protein: int | None = Query(None, ge=1),
    is_featured: bool | None = None,
    search: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ContentService = Depends(get_content_service),
) -> list[RecipeSummary]:
    """
    List recipes with optional filtering.

    Filters:
    - meal_type: breakfast, lunch, dinner, snack
    - diet_tags: high_protein, low_carb, keto, vegan, vegetarian, etc.
    - max_prep_time: Maximum preparation time in minutes
    - max_calories: Maximum calories per serving
    - min_protein: Minimum protein in grams
    - is_featured: Featured recipes only
    - search: Search in name and description
    """
    filters = RecipeFilter(
        meal_type=meal_type,
        diet_tags=diet_tags,
        max_prep_time=max_prep_time,
        max_calories=max_calories,
        min_protein=min_protein,
        is_featured=is_featured,
        search=search,
    )
    return await service.list_recipes(filters, identity_id, limit, offset)


@router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(
    recipe_id: str,
    service: ContentService = Depends(get_content_service),
) -> Recipe:
    """Get a specific recipe with full details."""
    recipe = await service.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.post("/recipes/saved", response_model=UserSavedRecipe, status_code=status.HTTP_201_CREATED)
async def save_recipe(
    identity_id: str,  # TODO: Extract from JWT
    request: SaveRecipeRequest,
    service: ContentService = Depends(get_content_service),
) -> UserSavedRecipe:
    """Save a recipe to user's saved recipes."""
    try:
        return await service.save_recipe(identity_id, request.recipe_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/recipes/saved/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_recipe(
    recipe_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: ContentService = Depends(get_content_service),
) -> None:
    """Remove a recipe from user's saved recipes."""
    try:
        await service.unsave_recipe(identity_id, recipe_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/recipes/saved/list", response_model=list[RecipeSummary])
async def get_saved_recipes(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ContentService = Depends(get_content_service),
) -> list[RecipeSummary]:
    """Get user's saved recipes."""
    return await service.get_saved_recipes(identity_id, limit, offset)
