"""FastAPI routes for PROFILE module."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.profile.models import (
    UserProfile, UserPreferences, UserGoals, HealthProfile,
    DietaryProfile, WorkoutRestrictions, SocialProfile,
    GDPRExport, OnboardingStatus, CompleteProfile,
    CreateProfileRequest, UpdateProfileRequest, UpdateGoalsRequest,
    UpdateHealthRequest, UpdateDietaryRequest, UpdateWorkoutRestrictionsRequest,
    UpdateSocialRequest, UpdatePreferencesRequest,
)
from src.modules.profile.service import ProfileService

router = APIRouter(tags=["profile"])


def get_profile_service(db: AsyncSession = Depends(get_db)) -> ProfileService:
    return ProfileService(db)


# =========================================================================
# Core Profile
# =========================================================================

@router.post("", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def create_profile(
    identity_id: str,
    request: CreateProfileRequest,
    service: ProfileService = Depends(get_profile_service),
) -> UserProfile:
    """Create a new user profile."""
    existing = await service.get_profile(identity_id)
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    return await service.create_profile(identity_id, request)


@router.get("", response_model=UserProfile)
async def get_profile(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> UserProfile:
    """Get user profile."""
    profile = await service.get_profile(identity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("", response_model=UserProfile)
async def update_profile(
    identity_id: str,
    request: UpdateProfileRequest,
    service: ProfileService = Depends(get_profile_service),
) -> UserProfile:
    """Update user profile."""
    return await service.update_profile(identity_id, request)


@router.get("/complete", response_model=CompleteProfile)
async def get_complete_profile(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> CompleteProfile:
    """Get complete profile with all sections."""
    profile = await service.get_complete_profile(identity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# =========================================================================
# Goals
# =========================================================================

@router.get("/goals", response_model=UserGoals)
async def get_goals(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> UserGoals:
    """Get user goals."""
    return await service.get_goals(identity_id)


@router.patch("/goals", response_model=UserGoals)
async def update_goals(
    identity_id: str,
    request: UpdateGoalsRequest,
    service: ProfileService = Depends(get_profile_service),
) -> UserGoals:
    """Update user goals."""
    return await service.update_goals(identity_id, request)


# =========================================================================
# Health Profile
# =========================================================================

@router.get("/health", response_model=HealthProfile)
async def get_health_profile(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> HealthProfile:
    """Get health profile."""
    return await service.get_health_profile(identity_id)


@router.patch("/health", response_model=HealthProfile)
async def update_health_profile(
    identity_id: str,
    request: UpdateHealthRequest,
    service: ProfileService = Depends(get_profile_service),
) -> HealthProfile:
    """Update health profile."""
    return await service.update_health_profile(identity_id, request)


@router.get("/health/fasting-safety")
async def check_fasting_safety(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> dict:
    """Check if fasting is safe based on health conditions."""
    safe, warnings = await service.is_fasting_safe(identity_id)
    return {"safe": safe, "warnings": warnings}


# =========================================================================
# Dietary Preferences
# =========================================================================

@router.get("/dietary", response_model=DietaryProfile)
async def get_dietary_profile(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> DietaryProfile:
    """Get dietary preferences."""
    return await service.get_dietary_profile(identity_id)


@router.patch("/dietary", response_model=DietaryProfile)
async def update_dietary_profile(
    identity_id: str,
    request: UpdateDietaryRequest,
    service: ProfileService = Depends(get_profile_service),
) -> DietaryProfile:
    """Update dietary preferences."""
    return await service.update_dietary_profile(identity_id, request)


# =========================================================================
# Workout Restrictions
# =========================================================================

@router.get("/workout-restrictions", response_model=WorkoutRestrictions)
async def get_workout_restrictions(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> WorkoutRestrictions:
    """Get workout restrictions."""
    return await service.get_workout_restrictions(identity_id)


@router.patch("/workout-restrictions", response_model=WorkoutRestrictions)
async def update_workout_restrictions(
    identity_id: str,
    request: UpdateWorkoutRestrictionsRequest,
    service: ProfileService = Depends(get_profile_service),
) -> WorkoutRestrictions:
    """Update workout restrictions."""
    return await service.update_workout_restrictions(identity_id, request)


@router.get("/workout-restrictions/safe-exercises")
async def get_safe_exercises(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> dict:
    """Get exercise recommendations based on restrictions."""
    return await service.get_safe_exercises(identity_id)


# =========================================================================
# Social Profile
# =========================================================================

@router.get("/social", response_model=SocialProfile)
async def get_social_profile(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> SocialProfile:
    """Get social profile."""
    return await service.get_social_profile(identity_id)


@router.patch("/social", response_model=SocialProfile)
async def update_social_profile(
    identity_id: str,
    request: UpdateSocialRequest,
    service: ProfileService = Depends(get_profile_service),
) -> SocialProfile:
    """Update social profile."""
    try:
        return await service.update_social_profile(identity_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/social/check-username")
async def check_username(
    username: str,
    service: ProfileService = Depends(get_profile_service),
) -> dict:
    """Check if username is available."""
    available = await service.check_username_available(username)
    return {"available": available}


@router.get("/social/friend-code/{friend_code}", response_model=SocialProfile)
async def find_by_friend_code(
    friend_code: str,
    service: ProfileService = Depends(get_profile_service),
) -> SocialProfile:
    """Find user by friend code."""
    profile = await service.find_by_friend_code(friend_code)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


# =========================================================================
# Preferences
# =========================================================================

@router.get("/preferences", response_model=UserPreferences)
async def get_preferences(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> UserPreferences:
    """Get user preferences."""
    return await service.get_preferences(identity_id)


@router.patch("/preferences", response_model=UserPreferences)
async def update_preferences(
    identity_id: str,
    request: UpdatePreferencesRequest,
    service: ProfileService = Depends(get_profile_service),
) -> UserPreferences:
    """Update user preferences."""
    return await service.update_preferences(identity_id, request)


# =========================================================================
# Onboarding
# =========================================================================

@router.get("/onboarding", response_model=OnboardingStatus)
async def get_onboarding_status(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> OnboardingStatus:
    """Get onboarding progress."""
    return await service.get_onboarding_status(identity_id)


@router.post("/onboarding/{step}/complete", response_model=OnboardingStatus)
async def complete_onboarding_step(
    identity_id: str,
    step: str,
    service: ProfileService = Depends(get_profile_service),
) -> OnboardingStatus:
    """Mark an onboarding step as complete."""
    return await service.complete_onboarding_step(identity_id, step)


@router.post("/onboarding/{step}/skip", response_model=OnboardingStatus)
async def skip_onboarding_step(
    identity_id: str,
    step: str,
    service: ProfileService = Depends(get_profile_service),
) -> OnboardingStatus:
    """Skip an onboarding step."""
    return await service.skip_onboarding_step(identity_id, step)


# =========================================================================
# GDPR Compliance
# =========================================================================

@router.get("/export", response_model=GDPRExport)
async def export_data(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> GDPRExport:
    """Export all user data (GDPR)."""
    return await service.export_data(identity_id)


@router.delete("/all-data")
async def delete_all_data(
    identity_id: str,
    confirm: bool = False,
    service: ProfileService = Depends(get_profile_service),
) -> dict:
    """Delete all user data (GDPR right to erasure)."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Must confirm deletion with ?confirm=true")
    await service.delete_all_data(identity_id)
    return {"status": "deleted"}


@router.post("/anonymize")
async def anonymize_data(
    identity_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> dict:
    """Anonymize user data while keeping aggregate statistics."""
    await service.anonymize_data(identity_id)
    return {"status": "anonymized"}
