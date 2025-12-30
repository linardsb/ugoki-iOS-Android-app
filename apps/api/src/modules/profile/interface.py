"""Abstract interface for PROFILE module."""

from abc import ABC, abstractmethod

from src.modules.profile.models import (
    UserProfile, UserPreferences, UserGoals, HealthProfile,
    DietaryProfile, WorkoutRestrictions, SocialProfile,
    GDPRExport, OnboardingStatus, CompleteProfile,
    CreateProfileRequest, UpdateProfileRequest, UpdateGoalsRequest,
    UpdateHealthRequest, UpdateDietaryRequest, UpdateWorkoutRestrictionsRequest,
    UpdateSocialRequest, UpdatePreferencesRequest,
)


class ProfileInterface(ABC):
    """
    PROFILE module interface.
    
    Manages user PII, preferences, goals, health info, and GDPR compliance.
    This module is isolated to contain all personal data.
    """

    # =========================================================================
    # Core Profile
    # =========================================================================

    @abstractmethod
    async def create_profile(self, identity_id: str, request: CreateProfileRequest) -> UserProfile:
        """Create a new user profile."""
        pass

    @abstractmethod
    async def get_profile(self, identity_id: str) -> UserProfile | None:
        """Get a user's profile."""
        pass

    @abstractmethod
    async def update_profile(self, identity_id: str, request: UpdateProfileRequest) -> UserProfile:
        """Update a user's profile."""
        pass

    @abstractmethod
    async def get_complete_profile(self, identity_id: str) -> CompleteProfile | None:
        """Get complete profile with all sections."""
        pass

    # =========================================================================
    # Goals
    # =========================================================================

    @abstractmethod
    async def get_goals(self, identity_id: str) -> UserGoals:
        """Get user goals (creates defaults if not exists)."""
        pass

    @abstractmethod
    async def update_goals(self, identity_id: str, request: UpdateGoalsRequest) -> UserGoals:
        """Update user goals."""
        pass

    # =========================================================================
    # Health Profile
    # =========================================================================

    @abstractmethod
    async def get_health_profile(self, identity_id: str) -> HealthProfile:
        """Get health profile."""
        pass

    @abstractmethod
    async def update_health_profile(self, identity_id: str, request: UpdateHealthRequest) -> HealthProfile:
        """Update health profile."""
        pass

    @abstractmethod
    async def is_fasting_safe(self, identity_id: str) -> tuple[bool, list[str]]:
        """Check if fasting is safe based on health conditions. Returns (safe, warnings)."""
        pass

    # =========================================================================
    # Dietary Preferences
    # =========================================================================

    @abstractmethod
    async def get_dietary_profile(self, identity_id: str) -> DietaryProfile:
        """Get dietary preferences."""
        pass

    @abstractmethod
    async def update_dietary_profile(self, identity_id: str, request: UpdateDietaryRequest) -> DietaryProfile:
        """Update dietary preferences."""
        pass

    # =========================================================================
    # Workout Restrictions
    # =========================================================================

    @abstractmethod
    async def get_workout_restrictions(self, identity_id: str) -> WorkoutRestrictions:
        """Get workout restrictions."""
        pass

    @abstractmethod
    async def update_workout_restrictions(self, identity_id: str, request: UpdateWorkoutRestrictionsRequest) -> WorkoutRestrictions:
        """Update workout restrictions."""
        pass

    @abstractmethod
    async def get_safe_exercises(self, identity_id: str) -> dict:
        """Get exercise recommendations based on restrictions."""
        pass

    # =========================================================================
    # Social Profile
    # =========================================================================

    @abstractmethod
    async def get_social_profile(self, identity_id: str) -> SocialProfile:
        """Get social profile."""
        pass

    @abstractmethod
    async def update_social_profile(self, identity_id: str, request: UpdateSocialRequest) -> SocialProfile:
        """Update social profile."""
        pass

    @abstractmethod
    async def check_username_available(self, username: str) -> bool:
        """Check if username is available."""
        pass

    @abstractmethod
    async def find_by_friend_code(self, friend_code: str) -> SocialProfile | None:
        """Find user by friend code."""
        pass

    # =========================================================================
    # Preferences
    # =========================================================================

    @abstractmethod
    async def get_preferences(self, identity_id: str) -> UserPreferences:
        """Get user preferences."""
        pass

    @abstractmethod
    async def update_preferences(self, identity_id: str, request: UpdatePreferencesRequest) -> UserPreferences:
        """Update user preferences."""
        pass

    # =========================================================================
    # Onboarding
    # =========================================================================

    @abstractmethod
    async def get_onboarding_status(self, identity_id: str) -> OnboardingStatus:
        """Get onboarding progress."""
        pass

    @abstractmethod
    async def complete_onboarding_step(self, identity_id: str, step: str) -> OnboardingStatus:
        """Mark an onboarding step as complete."""
        pass

    @abstractmethod
    async def skip_onboarding_step(self, identity_id: str, step: str) -> OnboardingStatus:
        """Skip an onboarding step."""
        pass

    # =========================================================================
    # GDPR Compliance
    # =========================================================================

    @abstractmethod
    async def export_data(self, identity_id: str) -> GDPRExport:
        """Export all user data (GDPR right to data portability)."""
        pass

    @abstractmethod
    async def delete_all_data(self, identity_id: str) -> bool:
        """Delete all user data (GDPR right to erasure)."""
        pass

    @abstractmethod
    async def anonymize_data(self, identity_id: str) -> bool:
        """Anonymize user data while keeping aggregate statistics."""
        pass
