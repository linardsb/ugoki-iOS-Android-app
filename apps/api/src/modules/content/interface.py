"""Abstract interface for CONTENT module."""

from abc import ABC, abstractmethod

from src.modules.content.models import (
    Workout,
    Exercise,
    WorkoutCategory,
    WorkoutSession,
    WorkoutFilter,
    WorkoutRecommendation,
    ExerciseFilter,
)


class ContentInterface(ABC):
    """
    CONTENT module interface.
    
    Manages workout library, exercises, and recommendations.
    """

    # =========================================================================
    # Workouts
    # =========================================================================

    @abstractmethod
    async def get_workout(self, workout_id: str) -> Workout | None:
        """Get a workout by ID."""
        pass

    @abstractmethod
    async def list_workouts(
        self,
        filters: WorkoutFilter | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Workout]:
        """List workouts with optional filtering."""
        pass

    @abstractmethod
    async def get_workout_with_exercises(self, workout_id: str) -> Workout | None:
        """Get a workout with all its exercises."""
        pass

    # =========================================================================
    # Categories
    # =========================================================================

    @abstractmethod
    async def list_categories(self) -> list[WorkoutCategory]:
        """List all workout categories."""
        pass

    @abstractmethod
    async def get_category(self, category_id: str) -> WorkoutCategory | None:
        """Get a category by ID."""
        pass

    # =========================================================================
    # Workout Sessions (User History)
    # =========================================================================

    @abstractmethod
    async def start_workout(
        self,
        identity_id: str,
        workout_id: str,
    ) -> WorkoutSession:
        """Start a workout session."""
        pass

    @abstractmethod
    async def complete_workout(
        self,
        session_id: str,
        calories_burned: int | None = None,
    ) -> WorkoutSession:
        """Complete a workout session."""
        pass

    @abstractmethod
    async def abandon_workout(self, session_id: str) -> WorkoutSession:
        """Abandon a workout session."""
        pass

    @abstractmethod
    async def get_workout_history(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[WorkoutSession]:
        """Get user's workout history."""
        pass

    @abstractmethod
    async def get_active_session(self, identity_id: str) -> WorkoutSession | None:
        """Get user's currently active workout session."""
        pass

    # =========================================================================
    # Recommendations
    # =========================================================================

    @abstractmethod
    async def get_recommendations(
        self,
        identity_id: str,
        limit: int = 5,
    ) -> list[WorkoutRecommendation]:
        """Get personalized workout recommendations."""
        pass

    # =========================================================================
    # Exercises
    # =========================================================================

    @abstractmethod
    async def list_exercises(
        self,
        filters: ExerciseFilter | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Exercise]:
        """List unique exercises with optional filtering."""
        pass

    # =========================================================================
    # Stats
    # =========================================================================

    @abstractmethod
    async def get_workout_stats(self, identity_id: str) -> dict:
        """Get user's workout statistics."""
        pass
