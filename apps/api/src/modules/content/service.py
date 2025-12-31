"""Service implementation for CONTENT module."""

import uuid
from datetime import datetime, UTC, timedelta
from collections import Counter
from typing import TYPE_CHECKING

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.content.interface import ContentInterface
from src.modules.content.models import (
    Workout,
    Exercise,
    WorkoutCategory,
    WorkoutSession,
    WorkoutFilter,
    WorkoutRecommendation,
    WorkoutStats,
    WorkoutType,
    DifficultyLevel,
    SessionStatus,
    Recipe,
    RecipeSummary,
    RecipeFilter,
    NutritionInfo,
    Ingredient,
    UserSavedRecipe,
    MealType,
    DietTag,
)
from src.modules.content.orm import (
    WorkoutORM,
    ExerciseORM,
    WorkoutCategoryORM,
    WorkoutSessionORM,
    RecipeORM,
    UserSavedRecipeORM,
)

if TYPE_CHECKING:
    from src.modules.event_journal.service import EventJournalService


def _ensure_tz(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class ContentService(ContentInterface):
    """Implementation of CONTENT interface."""

    def __init__(
        self,
        db: AsyncSession,
        event_journal: "EventJournalService | None" = None,
    ):
        self._db = db
        self._event_journal = event_journal

    # =========================================================================
    # Conversion helpers
    # =========================================================================

    def _category_to_model(self, orm: WorkoutCategoryORM, workout_count: int = 0) -> WorkoutCategory:
        return WorkoutCategory(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            icon=orm.icon,
            color=orm.color,
            workout_count=workout_count,
        )

    def _exercise_to_model(self, orm: ExerciseORM) -> Exercise:
        return Exercise(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            duration_seconds=orm.duration_seconds,
            rest_seconds=orm.rest_seconds,
            video_url=orm.video_url,
            thumbnail_url=orm.thumbnail_url,
            calories_per_minute=orm.calories_per_minute,
            order=orm.order,
        )

    def _workout_to_model(
        self,
        orm: WorkoutORM,
        include_exercises: bool = False,
        include_category: bool = False,
    ) -> Workout:
        avg_rating = None
        if orm.rating_count > 0:
            avg_rating = round(orm.total_rating / orm.rating_count, 1)

        exercises = []
        if include_exercises and orm.exercises:
            exercises = [self._exercise_to_model(e) for e in orm.exercises]

        category = None
        if include_category and orm.category:
            category = self._category_to_model(orm.category)

        return Workout(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            workout_type=orm.workout_type,
            difficulty=orm.difficulty,
            duration_minutes=orm.duration_minutes,
            calories_estimate=orm.calories_estimate,
            thumbnail_url=orm.thumbnail_url,
            video_url=orm.video_url,
            category_id=orm.category_id,
            category=category,
            exercises=exercises,
            equipment_needed=orm.equipment_needed or [],
            is_featured=orm.is_featured,
            is_premium=orm.is_premium,
            times_completed=orm.times_completed,
            average_rating=avg_rating,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _session_to_model(
        self,
        orm: WorkoutSessionORM,
        include_workout: bool = False,
    ) -> WorkoutSession:
        workout = None
        if include_workout and orm.workout:
            workout = self._workout_to_model(orm.workout)

        return WorkoutSession(
            id=orm.id,
            identity_id=orm.identity_id,
            workout_id=orm.workout_id,
            workout=workout,
            status=orm.status,
            started_at=_ensure_tz(orm.started_at),
            completed_at=_ensure_tz(orm.completed_at),
            duration_seconds=orm.duration_seconds,
            calories_burned=orm.calories_burned,
            xp_earned=orm.xp_earned,
        )

    # =========================================================================
    # Workouts
    # =========================================================================

    async def get_workout(self, workout_id: str) -> Workout | None:
        result = await self._db.execute(
            select(WorkoutORM)
            .options(selectinload(WorkoutORM.category))
            .where(WorkoutORM.id == workout_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            return None
        return self._workout_to_model(orm, include_category=True)

    async def list_workouts(
        self,
        filters: WorkoutFilter | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Workout]:
        query = select(WorkoutORM).options(selectinload(WorkoutORM.category))

        if filters:
            conditions = []
            if filters.workout_type:
                conditions.append(WorkoutORM.workout_type == filters.workout_type)
            if filters.difficulty:
                conditions.append(WorkoutORM.difficulty == filters.difficulty)
            if filters.category_id:
                conditions.append(WorkoutORM.category_id == filters.category_id)
            if filters.min_duration:
                conditions.append(WorkoutORM.duration_minutes >= filters.min_duration)
            if filters.max_duration:
                conditions.append(WorkoutORM.duration_minutes <= filters.max_duration)
            if filters.is_featured is not None:
                conditions.append(WorkoutORM.is_featured == filters.is_featured)
            if filters.search:
                search_term = f"%{filters.search}%"
                conditions.append(
                    or_(
                        WorkoutORM.name.ilike(search_term),
                        WorkoutORM.description.ilike(search_term),
                    )
                )
            if conditions:
                query = query.where(and_(*conditions))

        query = query.order_by(WorkoutORM.is_featured.desc(), WorkoutORM.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self._db.execute(query)
        return [
            self._workout_to_model(orm, include_category=True)
            for orm in result.scalars().all()
        ]

    async def get_workout_with_exercises(self, workout_id: str) -> Workout | None:
        result = await self._db.execute(
            select(WorkoutORM)
            .options(
                selectinload(WorkoutORM.category),
                selectinload(WorkoutORM.exercises),
            )
            .where(WorkoutORM.id == workout_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            return None
        return self._workout_to_model(orm, include_exercises=True, include_category=True)

    # =========================================================================
    # Categories
    # =========================================================================

    async def list_categories(self) -> list[WorkoutCategory]:
        # Get categories with workout counts
        result = await self._db.execute(
            select(
                WorkoutCategoryORM,
                func.count(WorkoutORM.id).label("workout_count")
            )
            .outerjoin(WorkoutORM)
            .group_by(WorkoutCategoryORM.id)
            .order_by(WorkoutCategoryORM.name)
        )
        return [
            self._category_to_model(row[0], row[1])
            for row in result.all()
        ]

    async def get_category(self, category_id: str) -> WorkoutCategory | None:
        result = await self._db.execute(
            select(
                WorkoutCategoryORM,
                func.count(WorkoutORM.id).label("workout_count")
            )
            .outerjoin(WorkoutORM)
            .where(WorkoutCategoryORM.id == category_id)
            .group_by(WorkoutCategoryORM.id)
        )
        row = result.first()
        if not row:
            return None
        return self._category_to_model(row[0], row[1])

    # =========================================================================
    # Workout Sessions
    # =========================================================================

    async def start_workout(
        self,
        identity_id: str,
        workout_id: str,
    ) -> WorkoutSession:
        # Check if workout exists
        workout = await self.get_workout(workout_id)
        if not workout:
            raise ValueError(f"Workout {workout_id} not found")

        # Check for existing active session
        existing = await self.get_active_session(identity_id)
        if existing:
            # Abandon the existing session
            await self.abandon_workout(existing.id)

        session = WorkoutSessionORM(
            id=str(uuid.uuid4()),
            identity_id=identity_id,
            workout_id=workout_id,
            status=SessionStatus.ACTIVE,
            started_at=datetime.now(UTC),
        )
        self._db.add(session)
        await self._db.commit()
        await self._db.refresh(session)

        # Record event
        await self._record_workout_event(
            identity_id=identity_id,
            action="started",
            session_id=session.id,
            workout_name=workout.name,
        )

        return self._session_to_model(session)

    async def complete_workout(
        self,
        session_id: str,
        calories_burned: int | None = None,
    ) -> WorkoutSession:
        result = await self._db.execute(
            select(WorkoutSessionORM)
            .options(selectinload(WorkoutSessionORM.workout))
            .where(WorkoutSessionORM.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if session.status != SessionStatus.ACTIVE:
            raise ValueError(f"Session is not active (status: {session.status})")

        now = datetime.now(UTC)

        # Use workout's expected duration (not wall-clock time which may be shorter if skipping)
        if session.workout:
            duration = session.workout.duration_minutes * 60
        else:
            duration = int((now - session.started_at.replace(tzinfo=UTC)).total_seconds())

        # Use workout's calories estimate as minimum (mobile calculation may be lower if skipping)
        if session.workout:
            estimated_calories = session.workout.calories_estimate
            # Use the higher of: mobile-calculated calories or workout estimate
            if calories_burned is None or calories_burned < estimated_calories * 0.5:
                calories_burned = estimated_calories
        elif calories_burned is None:
            calories_burned = 0

        # Award XP (75 base + duration bonus)
        xp_earned = 75 + min(duration // 60, 30)  # Up to 30 extra XP for longer workouts

        session.status = SessionStatus.COMPLETED
        session.completed_at = now
        session.duration_seconds = duration
        session.calories_burned = calories_burned
        session.xp_earned = xp_earned

        # Update workout completion count
        if session.workout:
            session.workout.times_completed += 1

        await self._db.commit()
        await self._db.refresh(session)

        # Record event
        await self._record_workout_event(
            identity_id=session.identity_id,
            action="completed",
            session_id=session.id,
            workout_name=session.workout.name if session.workout else None,
            duration_minutes=duration // 60,
            calories_burned=calories_burned,
            xp_earned=xp_earned,
        )

        return self._session_to_model(session, include_workout=True)

    async def abandon_workout(self, session_id: str) -> WorkoutSession:
        result = await self._db.execute(
            select(WorkoutSessionORM)
            .options(selectinload(WorkoutSessionORM.workout))
            .where(WorkoutSessionORM.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.status = SessionStatus.ABANDONED
        session.completed_at = datetime.now(UTC)

        await self._db.commit()
        await self._db.refresh(session)

        # Record event
        await self._record_workout_event(
            identity_id=session.identity_id,
            action="abandoned",
            session_id=session.id,
            workout_name=session.workout.name if session.workout else None,
        )

        return self._session_to_model(session)

    async def get_workout_history(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[WorkoutSession]:
        result = await self._db.execute(
            select(WorkoutSessionORM)
            .options(selectinload(WorkoutSessionORM.workout))
            .where(WorkoutSessionORM.identity_id == identity_id)
            .order_by(WorkoutSessionORM.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [
            self._session_to_model(orm, include_workout=True)
            for orm in result.scalars().all()
        ]

    async def get_active_session(self, identity_id: str) -> WorkoutSession | None:
        result = await self._db.execute(
            select(WorkoutSessionORM)
            .options(selectinload(WorkoutSessionORM.workout))
            .where(
                WorkoutSessionORM.identity_id == identity_id,
                WorkoutSessionORM.status == SessionStatus.ACTIVE,
            )
        )
        orm = result.scalar_one_or_none()
        if not orm:
            return None
        return self._session_to_model(orm, include_workout=True)

    # =========================================================================
    # Recommendations
    # =========================================================================

    async def get_recommendations(
        self,
        identity_id: str,
        limit: int = 5,
    ) -> list[WorkoutRecommendation]:
        recommendations = []

        # Get user's workout history to understand preferences
        history = await self.get_workout_history(identity_id, limit=50)
        completed = [s for s in history if s.status == SessionStatus.COMPLETED]

        # Count favorite types
        type_counts = Counter(s.workout.workout_type for s in completed if s.workout)
        favorite_type = type_counts.most_common(1)[0][0] if type_counts else None

        # Get completed workout IDs to exclude
        completed_ids = {s.workout_id for s in completed}

        # 1. Featured workouts
        featured = await self.list_workouts(
            filters=WorkoutFilter(is_featured=True),
            limit=2,
        )
        for w in featured:
            if w.id not in completed_ids:
                recommendations.append(
                    WorkoutRecommendation(
                        workout=w,
                        reason="Featured workout",
                        score=0.9,
                    )
                )

        # 2. Based on favorite type
        if favorite_type and len(recommendations) < limit:
            similar = await self.list_workouts(
                filters=WorkoutFilter(workout_type=favorite_type),
                limit=3,
            )
            for w in similar:
                if w.id not in completed_ids and w.id not in {r.workout.id for r in recommendations}:
                    recommendations.append(
                        WorkoutRecommendation(
                            workout=w,
                            reason=f"Based on your love of {favorite_type.value} workouts",
                            score=0.8,
                        )
                    )

        # 3. Try something new (different type)
        if len(recommendations) < limit:
            all_types = set(WorkoutType)
            tried_types = set(type_counts.keys())
            new_types = all_types - tried_types

            if new_types:
                new_type = list(new_types)[0]
                new_workouts = await self.list_workouts(
                    filters=WorkoutFilter(workout_type=new_type, difficulty=DifficultyLevel.BEGINNER),
                    limit=2,
                )
                for w in new_workouts:
                    if w.id not in {r.workout.id for r in recommendations}:
                        recommendations.append(
                            WorkoutRecommendation(
                                workout=w,
                                reason=f"Try something new: {new_type.value}",
                                score=0.7,
                            )
                        )

        # 4. Fill with popular workouts
        if len(recommendations) < limit:
            popular = await self._db.execute(
                select(WorkoutORM)
                .options(selectinload(WorkoutORM.category))
                .order_by(WorkoutORM.times_completed.desc())
                .limit(limit * 2)
            )
            for orm in popular.scalars().all():
                if len(recommendations) >= limit:
                    break
                if orm.id not in {r.workout.id for r in recommendations}:
                    recommendations.append(
                        WorkoutRecommendation(
                            workout=self._workout_to_model(orm, include_category=True),
                            reason="Popular with other users",
                            score=0.6,
                        )
                    )

        return recommendations[:limit]

    # =========================================================================
    # Stats
    # =========================================================================

    async def get_workout_stats(self, identity_id: str) -> dict:
        # Get all completed sessions
        result = await self._db.execute(
            select(WorkoutSessionORM)
            .options(selectinload(WorkoutSessionORM.workout))
            .where(
                WorkoutSessionORM.identity_id == identity_id,
                WorkoutSessionORM.status == SessionStatus.COMPLETED,
            )
        )
        sessions = result.scalars().all()

        if not sessions:
            return WorkoutStats().model_dump()

        # Calculate stats
        total_duration = sum(s.duration_seconds or 0 for s in sessions)
        total_calories = sum(s.calories_burned or 0 for s in sessions)

        # Favorite type
        type_counts = Counter(
            s.workout.workout_type for s in sessions if s.workout
        )
        favorite_type = type_counts.most_common(1)[0][0] if type_counts else None

        # This week's workouts
        week_ago = datetime.now(UTC) - timedelta(days=7)
        week_workouts = sum(
            1 for s in sessions
            if s.started_at.replace(tzinfo=UTC) >= week_ago
        )

        return WorkoutStats(
            total_workouts=len(sessions),
            total_duration_minutes=total_duration // 60,
            total_calories_burned=total_calories,
            favorite_workout_type=favorite_type,
            current_week_workouts=week_workouts,
            average_workout_duration=round(total_duration / len(sessions) / 60, 1) if sessions else 0,
        ).model_dump()

    # =========================================================================
    # Recipes
    # =========================================================================

    def _recipe_to_model(self, orm: RecipeORM) -> Recipe:
        """Convert RecipeORM to Recipe model."""
        avg_rating = None
        if orm.rating_count > 0:
            avg_rating = round(orm.total_rating / orm.rating_count, 1)

        # Parse JSON fields
        ingredients = []
        if orm.ingredients:
            ingredients = [Ingredient(**ing) for ing in orm.ingredients]

        instructions = orm.instructions or []

        diet_tags = []
        if orm.diet_tags:
            diet_tags = [DietTag(tag) for tag in orm.diet_tags]

        return Recipe(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            meal_type=orm.meal_type,
            prep_time_minutes=orm.prep_time_minutes,
            cook_time_minutes=orm.cook_time_minutes,
            servings=orm.servings,
            nutrition=NutritionInfo(
                calories=orm.calories,
                protein_g=orm.protein_g,
                carbs_g=orm.carbs_g,
                fat_g=orm.fat_g,
                fiber_g=orm.fiber_g,
                sugar_g=orm.sugar_g,
            ),
            ingredients=ingredients,
            instructions=instructions,
            diet_tags=diet_tags,
            image_url=orm.image_url,
            is_featured=orm.is_featured,
            times_saved=orm.times_saved,
            average_rating=avg_rating,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _recipe_to_summary(
        self,
        orm: RecipeORM,
        saved_recipe_ids: set[str] | None = None,
    ) -> RecipeSummary:
        """Convert RecipeORM to RecipeSummary."""
        diet_tags = []
        if orm.diet_tags:
            diet_tags = [DietTag(tag) for tag in orm.diet_tags]

        return RecipeSummary(
            id=orm.id,
            name=orm.name,
            meal_type=orm.meal_type,
            prep_time_minutes=orm.prep_time_minutes,
            calories=orm.calories,
            protein_g=orm.protein_g,
            diet_tags=diet_tags,
            image_url=orm.image_url,
            is_featured=orm.is_featured,
            is_saved=orm.id in (saved_recipe_ids or set()),
        )

    async def get_recipe(self, recipe_id: str) -> Recipe | None:
        """Get a recipe by ID."""
        result = await self._db.execute(
            select(RecipeORM).where(RecipeORM.id == recipe_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            return None
        return self._recipe_to_model(orm)

    async def list_recipes(
        self,
        filters: RecipeFilter | None = None,
        identity_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[RecipeSummary]:
        """List recipes with optional filtering."""
        query = select(RecipeORM)

        if filters:
            conditions = []
            if filters.meal_type:
                conditions.append(RecipeORM.meal_type == filters.meal_type)
            if filters.max_prep_time:
                conditions.append(RecipeORM.prep_time_minutes <= filters.max_prep_time)
            if filters.max_calories:
                conditions.append(RecipeORM.calories <= filters.max_calories)
            if filters.min_protein:
                conditions.append(RecipeORM.protein_g >= filters.min_protein)
            if filters.is_featured is not None:
                conditions.append(RecipeORM.is_featured == filters.is_featured)
            if filters.search:
                search_term = f"%{filters.search}%"
                conditions.append(
                    or_(
                        RecipeORM.name.ilike(search_term),
                        RecipeORM.description.ilike(search_term),
                    )
                )
            if conditions:
                query = query.where(and_(*conditions))

        query = query.order_by(RecipeORM.is_featured.desc(), RecipeORM.name)
        query = query.limit(limit).offset(offset)

        result = await self._db.execute(query)
        recipes = result.scalars().all()

        # Get user's saved recipe IDs if identity provided
        saved_ids: set[str] = set()
        if identity_id:
            saved_result = await self._db.execute(
                select(UserSavedRecipeORM.recipe_id)
                .where(UserSavedRecipeORM.identity_id == identity_id)
            )
            saved_ids = {row[0] for row in saved_result.all()}

        # Filter by diet tags in Python (JSON field)
        summaries = []
        for orm in recipes:
            if filters and filters.diet_tags:
                recipe_tags = set(orm.diet_tags or [])
                filter_tags = {tag.value for tag in filters.diet_tags}
                if not filter_tags.intersection(recipe_tags):
                    continue
            summaries.append(self._recipe_to_summary(orm, saved_ids))

        return summaries

    async def save_recipe(self, identity_id: str, recipe_id: str) -> UserSavedRecipe:
        """Save a recipe to user's saved recipes."""
        # Check if recipe exists
        recipe = await self.get_recipe(recipe_id)
        if not recipe:
            raise ValueError(f"Recipe {recipe_id} not found")

        # Check if already saved
        existing = await self._db.execute(
            select(UserSavedRecipeORM).where(
                UserSavedRecipeORM.identity_id == identity_id,
                UserSavedRecipeORM.recipe_id == recipe_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Recipe already saved")

        # Create saved recipe
        saved = UserSavedRecipeORM(
            id=str(uuid.uuid4()),
            identity_id=identity_id,
            recipe_id=recipe_id,
            saved_at=datetime.now(UTC),
        )
        self._db.add(saved)

        # Increment times_saved counter
        await self._db.execute(
            select(RecipeORM).where(RecipeORM.id == recipe_id)
        )
        recipe_orm = (await self._db.execute(
            select(RecipeORM).where(RecipeORM.id == recipe_id)
        )).scalar_one()
        recipe_orm.times_saved += 1

        await self._db.commit()
        await self._db.refresh(saved)

        # Record event
        await self._record_recipe_event(
            identity_id=identity_id,
            action="saved",
            recipe_id=recipe_id,
            recipe_name=recipe.name,
        )

        return UserSavedRecipe(
            id=saved.id,
            identity_id=saved.identity_id,
            recipe_id=saved.recipe_id,
            saved_at=_ensure_tz(saved.saved_at),
        )

    async def unsave_recipe(self, identity_id: str, recipe_id: str) -> None:
        """Remove a recipe from user's saved recipes."""
        result = await self._db.execute(
            select(UserSavedRecipeORM).where(
                UserSavedRecipeORM.identity_id == identity_id,
                UserSavedRecipeORM.recipe_id == recipe_id,
            )
        )
        saved = result.scalar_one_or_none()
        if not saved:
            raise ValueError("Recipe not saved")

        # Decrement times_saved counter
        recipe_orm = (await self._db.execute(
            select(RecipeORM).where(RecipeORM.id == recipe_id)
        )).scalar_one_or_none()
        if recipe_orm and recipe_orm.times_saved > 0:
            recipe_orm.times_saved -= 1

        await self._db.delete(saved)
        await self._db.commit()

        # Record event
        await self._record_recipe_event(
            identity_id=identity_id,
            action="unsaved",
            recipe_id=recipe_id,
            recipe_name=recipe_orm.name if recipe_orm else None,
        )

    async def get_saved_recipes(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[RecipeSummary]:
        """Get user's saved recipes."""
        result = await self._db.execute(
            select(UserSavedRecipeORM)
            .options(selectinload(UserSavedRecipeORM.recipe))
            .where(UserSavedRecipeORM.identity_id == identity_id)
            .order_by(UserSavedRecipeORM.saved_at.desc())
            .limit(limit)
            .offset(offset)
        )
        saved_recipes = result.scalars().all()

        saved_ids = {sr.recipe_id for sr in saved_recipes}
        return [
            self._recipe_to_summary(sr.recipe, saved_ids)
            for sr in saved_recipes
            if sr.recipe
        ]

    # =========================================================================
    # Event Journal Integration
    # =========================================================================

    async def _record_workout_event(
        self,
        identity_id: str,
        action: str,
        session_id: str,
        workout_name: str | None = None,
        duration_minutes: int | None = None,
        calories_burned: int | None = None,
        xp_earned: int | None = None,
    ) -> None:
        """Record a workout event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        event_type_map = {
            "started": EventType.WORKOUT_STARTED,
            "completed": EventType.WORKOUT_COMPLETED,
            "abandoned": EventType.WORKOUT_ABANDONED,
        }

        event_type = event_type_map.get(action)
        if not event_type:
            return

        metadata = {"workout_name": workout_name} if workout_name else {}
        if duration_minutes is not None:
            metadata["duration_minutes"] = duration_minutes
        if calories_burned is not None:
            metadata["calories_burned"] = calories_burned
        if xp_earned is not None:
            metadata["xp_earned"] = xp_earned

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=event_type,
            related_id=session_id,
            related_type="workout_session",
            source=EventSource.API,
            metadata=metadata,
        )

    async def _record_recipe_event(
        self,
        identity_id: str,
        action: str,
        recipe_id: str,
        recipe_name: str | None = None,
    ) -> None:
        """Record a recipe event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        event_type_map = {
            "saved": EventType.RECIPE_SAVED,
            "unsaved": EventType.RECIPE_UNSAVED,
        }

        event_type = event_type_map.get(action)
        if not event_type:
            return

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=event_type,
            related_id=recipe_id,
            related_type="recipe",
            source=EventSource.API,
            metadata={"recipe_name": recipe_name} if recipe_name else {},
        )
