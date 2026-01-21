"""Service implementation for PROFILE module."""

import uuid
import secrets
from datetime import datetime, UTC

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.profile.interface import ProfileInterface
from src.modules.profile.models import (
    UserProfile, UserPreferences, UserGoals, HealthProfile,
    DietaryProfile, WorkoutRestrictions, SocialProfile,
    GDPRExport, OnboardingStatus, CompleteProfile,
    CreateProfileRequest, UpdateProfileRequest, UpdateGoalsRequest,
    UpdateHealthRequest, UpdateDietaryRequest, UpdateWorkoutRestrictionsRequest,
    UpdateSocialRequest, UpdatePreferencesRequest,
    HealthCondition, GoalType, FitnessLevel,
)
from src.modules.profile.orm import (
    UserProfileORM, UserGoalsORM, HealthProfileORM, DietaryProfileORM,
    WorkoutRestrictionsORM, SocialProfileORM, UserPreferencesORM, OnboardingStatusORM,
)


def _ensure_tz(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


# Health conditions that make fasting potentially unsafe
UNSAFE_FASTING_CONDITIONS = {
    HealthCondition.DIABETES_TYPE1,
    HealthCondition.HYPOGLYCEMIA,
    HealthCondition.EATING_DISORDER_HISTORY,
    HealthCondition.PREGNANT,
    HealthCondition.BREASTFEEDING,
}

CAUTION_FASTING_CONDITIONS = {
    HealthCondition.DIABETES_TYPE2,
    HealthCondition.HEART_CONDITION,
    HealthCondition.KIDNEY_DISEASE,
    HealthCondition.ON_MEDICATION,
}


class ProfileService(ProfileInterface):
    """Implementation of PROFILE interface."""

    def __init__(self, db: AsyncSession):
        self._db = db

    # =========================================================================
    # Conversion Helpers
    # =========================================================================

    def _profile_to_model(self, orm: UserProfileORM) -> UserProfile:
        return UserProfile(
            identity_id=orm.identity_id,
            email=orm.email,
            display_name=orm.display_name,
            first_name=orm.first_name,
            last_name=orm.last_name,
            phone=orm.phone,
            avatar_url=orm.avatar_url,
            date_of_birth=orm.date_of_birth,
            gender=orm.gender,
            height_cm=orm.height_cm,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _goals_to_model(self, orm: UserGoalsORM) -> UserGoals:
        return UserGoals(
            identity_id=orm.identity_id,
            primary_goal=orm.primary_goal,
            secondary_goals=orm.secondary_goals or [],
            starting_weight_kg=orm.starting_weight_kg,
            target_weight_kg=orm.target_weight_kg,
            target_date=orm.target_date,
            target_body_fat_percent=orm.target_body_fat_percent,
            target_muscle_mass_kg=orm.target_muscle_mass_kg,
            weekly_workout_goal=orm.weekly_workout_goal,
            daily_step_goal=orm.daily_step_goal,
            weekly_fasting_goal=orm.weekly_fasting_goal,
            target_fasting_hours=orm.target_fasting_hours,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _health_to_model(self, orm: HealthProfileORM) -> HealthProfile:
        conditions = [HealthCondition(c) for c in (orm.conditions or [])]
        return HealthProfile(
            identity_id=orm.identity_id,
            conditions=conditions,
            condition_notes=orm.condition_notes,
            takes_medication=orm.takes_medication,
            medication_notes=orm.medication_notes,
            medication_requires_food=orm.medication_requires_food,
            doctor_approved_fasting=orm.doctor_approved_fasting,
            doctor_consultation_date=orm.doctor_consultation_date,
            emergency_contact_name=orm.emergency_contact_name,
            emergency_contact_phone=orm.emergency_contact_phone,
            fasting_safe=orm.fasting_safe,
            requires_medical_disclaimer=orm.requires_medical_disclaimer,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _dietary_to_model(self, orm: DietaryProfileORM) -> DietaryProfile:
        return DietaryProfile(
            identity_id=orm.identity_id,
            dietary_preference=orm.dietary_preference,
            allergies=orm.allergies or [],
            intolerances=orm.intolerances or [],
            calories_target=orm.calories_target,
            protein_target_g=orm.protein_target_g,
            carbs_target_g=orm.carbs_target_g,
            fat_target_g=orm.fat_target_g,
            avoid_foods=orm.avoid_foods or [],
            favorite_foods=orm.favorite_foods or [],
            break_fast_preference=orm.break_fast_preference,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _restrictions_to_model(self, orm: WorkoutRestrictionsORM) -> WorkoutRestrictions:
        from src.modules.profile.models import InjuryArea
        injury_areas = [InjuryArea(a) for a in (orm.injury_areas or [])]
        chronic_areas = [InjuryArea(a) for a in (orm.chronic_pain_areas or [])]
        return WorkoutRestrictions(
            identity_id=orm.identity_id,
            injury_areas=injury_areas,
            injury_notes=orm.injury_notes,
            has_chronic_pain=orm.has_chronic_pain,
            chronic_pain_areas=chronic_areas,
            avoid_high_impact=orm.avoid_high_impact,
            avoid_jumping=orm.avoid_jumping,
            avoid_heavy_weights=orm.avoid_heavy_weights,
            avoid_floor_exercises=orm.avoid_floor_exercises,
            fitness_level=orm.fitness_level,
            max_workout_duration_minutes=orm.max_workout_duration_minutes,
            has_gym_access=orm.has_gym_access,
            home_equipment=orm.home_equipment or [],
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _social_to_model(self, orm: SocialProfileORM) -> SocialProfile:
        return SocialProfile(
            identity_id=orm.identity_id,
            username=orm.username,
            bio=orm.bio,
            friend_code=orm.friend_code,
            profile_public=orm.profile_public,
            show_streaks=orm.show_streaks,
            show_achievements=orm.show_achievements,
            show_level=orm.show_level,
            show_workouts=orm.show_workouts,
            show_weight=orm.show_weight,
            friends_count=orm.friends_count,
            followers_count=orm.followers_count,
            following_count=orm.following_count,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _preferences_to_model(self, orm: UserPreferencesORM) -> UserPreferences:
        return UserPreferences(
            identity_id=orm.identity_id,
            unit_system=orm.unit_system,
            timezone=orm.timezone,
            language=orm.language,
            default_fasting_protocol=orm.default_fasting_protocol,
            custom_fast_hours=orm.custom_fast_hours,
            eating_window_start=orm.eating_window_start,
            eating_window_end=orm.eating_window_end,
            preferred_workout_time=orm.preferred_workout_time,
            workout_reminder_enabled=orm.workout_reminder_enabled,
            preferred_workout_types=orm.preferred_workout_types or [],
            dark_mode=orm.dark_mode,
            haptic_feedback=orm.haptic_feedback,
            sound_effects=orm.sound_effects,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _onboarding_to_model(self, orm: OnboardingStatusORM) -> OnboardingStatus:
        return OnboardingStatus(
            identity_id=orm.identity_id,
            basic_profile_completed=orm.basic_profile_completed,
            goals_set=orm.goals_set,
            health_profile_completed=orm.health_profile_completed,
            dietary_preferences_set=orm.dietary_preferences_set,
            workout_restrictions_set=orm.workout_restrictions_set,
            bloodwork_uploaded=orm.bloodwork_uploaded,
            first_fast_completed=orm.first_fast_completed,
            first_workout_completed=orm.first_workout_completed,
            first_weight_logged=orm.first_weight_logged,
            onboarding_completed=orm.onboarding_completed,
            completed_at=_ensure_tz(orm.completed_at),
            skipped_steps=orm.skipped_steps or [],
        )

    # =========================================================================
    # Core Profile
    # =========================================================================

    async def create_profile(self, identity_id: str, request: CreateProfileRequest) -> UserProfile:
        profile = UserProfileORM(
            identity_id=identity_id,
            email=request.email,
            display_name=request.display_name,
            first_name=request.first_name,
            last_name=request.last_name,
        )
        self._db.add(profile)
        await self._db.commit()
        await self._db.refresh(profile)
        return self._profile_to_model(profile)

    async def get_profile(self, identity_id: str) -> UserProfile | None:
        result = await self._db.execute(
            select(UserProfileORM).where(UserProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        return self._profile_to_model(orm) if orm else None

    async def update_profile(self, identity_id: str, request: UpdateProfileRequest) -> UserProfile:
        result = await self._db.execute(
            select(UserProfileORM).where(UserProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = UserProfileORM(identity_id=identity_id)
            self._db.add(orm)

        for key, value in request.model_dump(exclude_unset=True).items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        
        # Update onboarding
        await self.complete_onboarding_step(identity_id, "basic_profile_completed")
        
        return self._profile_to_model(orm)

    async def get_complete_profile(self, identity_id: str) -> CompleteProfile | None:
        profile = await self.get_profile(identity_id)
        if not profile:
            return None

        return CompleteProfile(
            profile=profile,
            preferences=await self.get_preferences(identity_id),
            goals=await self._get_goals_if_exists(identity_id),
            health=await self._get_health_if_exists(identity_id),
            dietary=await self._get_dietary_if_exists(identity_id),
            workout_restrictions=await self._get_restrictions_if_exists(identity_id),
            social=await self._get_social_if_exists(identity_id),
            onboarding=await self.get_onboarding_status(identity_id),
        )

    async def _get_goals_if_exists(self, identity_id: str) -> UserGoals | None:
        result = await self._db.execute(
            select(UserGoalsORM).where(UserGoalsORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        return self._goals_to_model(orm) if orm else None

    async def _get_health_if_exists(self, identity_id: str) -> HealthProfile | None:
        result = await self._db.execute(
            select(HealthProfileORM).where(HealthProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        return self._health_to_model(orm) if orm else None

    async def _get_dietary_if_exists(self, identity_id: str) -> DietaryProfile | None:
        result = await self._db.execute(
            select(DietaryProfileORM).where(DietaryProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        return self._dietary_to_model(orm) if orm else None

    async def _get_restrictions_if_exists(self, identity_id: str) -> WorkoutRestrictions | None:
        result = await self._db.execute(
            select(WorkoutRestrictionsORM).where(WorkoutRestrictionsORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        return self._restrictions_to_model(orm) if orm else None

    async def _get_social_if_exists(self, identity_id: str) -> SocialProfile | None:
        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        return self._social_to_model(orm) if orm else None

    # =========================================================================
    # Goals
    # =========================================================================

    async def get_goals(self, identity_id: str) -> UserGoals:
        result = await self._db.execute(
            select(UserGoalsORM).where(UserGoalsORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = UserGoalsORM(identity_id=identity_id)
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._goals_to_model(orm)

    async def update_goals(self, identity_id: str, request: UpdateGoalsRequest) -> UserGoals:
        result = await self._db.execute(
            select(UserGoalsORM).where(UserGoalsORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = UserGoalsORM(identity_id=identity_id)
            self._db.add(orm)

        for key, value in request.model_dump(exclude_unset=True).items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        await self.complete_onboarding_step(identity_id, "goals_set")
        return self._goals_to_model(orm)

    # =========================================================================
    # Health Profile
    # =========================================================================

    async def get_health_profile(self, identity_id: str) -> HealthProfile:
        result = await self._db.execute(
            select(HealthProfileORM).where(HealthProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = HealthProfileORM(identity_id=identity_id)
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._health_to_model(orm)

    async def update_health_profile(self, identity_id: str, request: UpdateHealthRequest) -> HealthProfile:
        result = await self._db.execute(
            select(HealthProfileORM).where(HealthProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = HealthProfileORM(identity_id=identity_id)
            self._db.add(orm)

        data = request.model_dump(exclude_unset=True)
        if "conditions" in data:
            data["conditions"] = [c.value for c in data["conditions"]]
            # Update safety flags
            conditions_set = set(data["conditions"])
            orm.fasting_safe = not bool(conditions_set & {c.value for c in UNSAFE_FASTING_CONDITIONS})
            orm.requires_medical_disclaimer = bool(conditions_set & {c.value for c in CAUTION_FASTING_CONDITIONS})

        for key, value in data.items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        await self.complete_onboarding_step(identity_id, "health_profile_completed")
        return self._health_to_model(orm)

    async def is_fasting_safe(self, identity_id: str) -> tuple[bool, list[str]]:
        health = await self.get_health_profile(identity_id)
        warnings = []

        for condition in health.conditions:
            if condition in UNSAFE_FASTING_CONDITIONS:
                warnings.append(f"Fasting not recommended with {condition.value}. Please consult a doctor.")
            elif condition in CAUTION_FASTING_CONDITIONS:
                warnings.append(f"Consult your doctor before fasting with {condition.value}.")

        if health.medication_requires_food:
            warnings.append("Your medication requires food. Adjust fasting accordingly.")

        return health.fasting_safe, warnings

    # =========================================================================
    # Dietary Profile
    # =========================================================================

    async def get_dietary_profile(self, identity_id: str) -> DietaryProfile:
        result = await self._db.execute(
            select(DietaryProfileORM).where(DietaryProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = DietaryProfileORM(identity_id=identity_id)
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._dietary_to_model(orm)

    async def update_dietary_profile(self, identity_id: str, request: UpdateDietaryRequest) -> DietaryProfile:
        result = await self._db.execute(
            select(DietaryProfileORM).where(DietaryProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = DietaryProfileORM(identity_id=identity_id)
            self._db.add(orm)

        for key, value in request.model_dump(exclude_unset=True).items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        await self.complete_onboarding_step(identity_id, "dietary_preferences_set")
        return self._dietary_to_model(orm)

    # =========================================================================
    # Workout Restrictions
    # =========================================================================

    async def get_workout_restrictions(self, identity_id: str) -> WorkoutRestrictions:
        result = await self._db.execute(
            select(WorkoutRestrictionsORM).where(WorkoutRestrictionsORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = WorkoutRestrictionsORM(identity_id=identity_id)
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._restrictions_to_model(orm)

    async def update_workout_restrictions(self, identity_id: str, request: UpdateWorkoutRestrictionsRequest) -> WorkoutRestrictions:
        result = await self._db.execute(
            select(WorkoutRestrictionsORM).where(WorkoutRestrictionsORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = WorkoutRestrictionsORM(identity_id=identity_id)
            self._db.add(orm)

        data = request.model_dump(exclude_unset=True)
        if "injury_areas" in data:
            data["injury_areas"] = [a.value for a in data["injury_areas"]]
        if "chronic_pain_areas" in data:
            data["chronic_pain_areas"] = [a.value for a in data["chronic_pain_areas"]]

        for key, value in data.items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        await self.complete_onboarding_step(identity_id, "workout_restrictions_set")
        return self._restrictions_to_model(orm)

    async def get_safe_exercises(self, identity_id: str) -> dict:
        restrictions = await self.get_workout_restrictions(identity_id)
        
        recommendations = {
            "avoid": [],
            "modify": [],
            "recommended": [],
            "max_duration": restrictions.max_workout_duration_minutes,
            "fitness_level": restrictions.fitness_level.value,
        }

        if restrictions.avoid_high_impact:
            recommendations["avoid"].extend(["running", "jumping jacks", "box jumps"])
            recommendations["recommended"].extend(["swimming", "cycling", "walking"])
        
        if restrictions.avoid_jumping:
            recommendations["avoid"].extend(["jump squats", "burpees", "jump lunges"])
            recommendations["modify"].append("Replace jumping with stepping")

        if restrictions.avoid_floor_exercises:
            recommendations["avoid"].extend(["planks", "push-ups", "crunches"])
            recommendations["modify"].append("Use standing alternatives")

        return recommendations

    # =========================================================================
    # Social Profile
    # =========================================================================

    async def get_social_profile(self, identity_id: str) -> SocialProfile:
        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = SocialProfileORM(
                identity_id=identity_id,
                friend_code=secrets.token_hex(4).upper(),
            )
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._social_to_model(orm)

    async def update_social_profile(self, identity_id: str, request: UpdateSocialRequest) -> SocialProfile:
        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = SocialProfileORM(
                identity_id=identity_id,
                friend_code=secrets.token_hex(4).upper(),
            )
            self._db.add(orm)

        data = request.model_dump(exclude_unset=True)
        if "username" in data and data["username"]:
            if not await self.check_username_available(data["username"]):
                raise ValueError("Username already taken")

        for key, value in data.items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        return self._social_to_model(orm)

    async def check_username_available(self, username: str) -> bool:
        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.username == username)
        )
        return result.scalar_one_or_none() is None

    async def find_by_friend_code(self, friend_code: str) -> SocialProfile | None:
        result = await self._db.execute(
            select(SocialProfileORM).where(SocialProfileORM.friend_code == friend_code.upper())
        )
        orm = result.scalar_one_or_none()
        return self._social_to_model(orm) if orm else None

    # =========================================================================
    # Preferences
    # =========================================================================

    async def get_preferences(self, identity_id: str) -> UserPreferences:
        result = await self._db.execute(
            select(UserPreferencesORM).where(UserPreferencesORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = UserPreferencesORM(identity_id=identity_id)
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._preferences_to_model(orm)

    async def update_preferences(self, identity_id: str, request: UpdatePreferencesRequest) -> UserPreferences:
        result = await self._db.execute(
            select(UserPreferencesORM).where(UserPreferencesORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = UserPreferencesORM(identity_id=identity_id)
            self._db.add(orm)

        for key, value in request.model_dump(exclude_unset=True).items():
            setattr(orm, key, value)

        await self._db.commit()
        await self._db.refresh(orm)
        return self._preferences_to_model(orm)

    # =========================================================================
    # Onboarding
    # =========================================================================

    async def get_onboarding_status(self, identity_id: str) -> OnboardingStatus:
        result = await self._db.execute(
            select(OnboardingStatusORM).where(OnboardingStatusORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = OnboardingStatusORM(identity_id=identity_id)
            self._db.add(orm)
            await self._db.commit()
            await self._db.refresh(orm)
        return self._onboarding_to_model(orm)

    async def complete_onboarding_step(self, identity_id: str, step: str) -> OnboardingStatus:
        result = await self._db.execute(
            select(OnboardingStatusORM).where(OnboardingStatusORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = OnboardingStatusORM(identity_id=identity_id)
            self._db.add(orm)

        if hasattr(orm, step):
            setattr(orm, step, True)

        # Check if onboarding is complete
        required = ["basic_profile_completed", "goals_set"]
        if all(getattr(orm, s, False) for s in required):
            orm.onboarding_completed = True
            orm.completed_at = datetime.now(UTC)

        await self._db.commit()
        await self._db.refresh(orm)
        return self._onboarding_to_model(orm)

    async def skip_onboarding_step(self, identity_id: str, step: str) -> OnboardingStatus:
        result = await self._db.execute(
            select(OnboardingStatusORM).where(OnboardingStatusORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = OnboardingStatusORM(identity_id=identity_id)
            self._db.add(orm)

        skipped = orm.skipped_steps or []
        if step not in skipped:
            skipped.append(step)
            orm.skipped_steps = skipped

        await self._db.commit()
        await self._db.refresh(orm)
        return self._onboarding_to_model(orm)

    # =========================================================================
    # GDPR Compliance
    # =========================================================================

    async def export_data(self, identity_id: str) -> GDPRExport:
        # Get coach data for export
        coach_data = None
        try:
            from src.modules.ai_coach.service import AICoachService
            coach_service = AICoachService(self._db)
            coach_data = await coach_service.export_coach_data(identity_id)
        except Exception:
            pass  # Coach module may not be available

        export = GDPRExport(
            exported_at=datetime.now(UTC),
            identity_id=identity_id,
            profile=await self.get_profile(identity_id),
            preferences=await self.get_preferences(identity_id),
            goals=await self._get_goals_if_exists(identity_id),
            health=await self._get_health_if_exists(identity_id),
            dietary=await self._get_dietary_if_exists(identity_id),
            workout_restrictions=await self._get_restrictions_if_exists(identity_id),
            social=await self._get_social_if_exists(identity_id),
        )

        # Add coach data as additional field if available
        if coach_data:
            export_dict = export.model_dump()
            export_dict["coach_conversations"] = coach_data
            return GDPRExport(**{k: v for k, v in export_dict.items() if k != "coach_conversations"})

        return export

    async def delete_all_data(self, identity_id: str) -> bool:
        # Delete coach data first (via CASCADE will handle this, but explicit is better)
        try:
            from src.modules.ai_coach.service import AICoachService
            coach_service = AICoachService(self._db)
            await coach_service.delete_all_coach_data(identity_id)
        except Exception:
            pass  # Coach module may not be available

        tables = [
            UserProfileORM, UserGoalsORM, HealthProfileORM, DietaryProfileORM,
            WorkoutRestrictionsORM, SocialProfileORM, UserPreferencesORM, OnboardingStatusORM,
        ]
        for table in tables:
            await self._db.execute(delete(table).where(table.identity_id == identity_id))
        await self._db.commit()
        return True

    async def anonymize_data(self, identity_id: str) -> bool:
        profile = await self.get_profile(identity_id)
        if profile:
            result = await self._db.execute(
                select(UserProfileORM).where(UserProfileORM.identity_id == identity_id)
            )
            orm = result.scalar_one_or_none()
            if orm:
                orm.email = None
                orm.display_name = "Deleted User"
                orm.first_name = None
                orm.last_name = None
                orm.phone = None
                orm.avatar_url = None
                await self._db.commit()
        return True
