"""
Comprehensive seed script for UGOKI development.

Creates realistic test data including:
- 8 users (4 male, 4 female) with complete profiles
- Completed fasts and workout sessions
- Streaks and XP/levels
- Social relationships (friends, followers)
- Active challenges with participants

Run with: uv run python scripts/seed_users.py
"""

import asyncio
import uuid
import secrets
from datetime import datetime, date, time, timedelta, timezone
from random import randint, choice, sample

from sqlalchemy import select

from src.db.session import AsyncSessionLocal
from src.modules.identity.orm import IdentityORM
from src.modules.identity.models import IdentityType, AuthProvider
from src.modules.profile.orm import (
    UserProfileORM, UserGoalsORM, HealthProfileORM, DietaryProfileORM,
    WorkoutRestrictionsORM, SocialProfileORM, UserPreferencesORM, OnboardingStatusORM
)
from src.modules.profile.models import (
    Gender, UnitSystem, FastingProtocol, FitnessLevel, DietaryPreference, GoalType
)
from src.modules.time_keeper.orm import TimeWindowORM
from src.modules.time_keeper.models import WindowType, WindowState
from src.modules.progression.orm import StreakORM, XPTransactionORM, UserLevelORM
from src.modules.progression.models import StreakType, XPTransactionType
from src.modules.content.orm import WorkoutORM, WorkoutSessionORM
from src.modules.content.models import SessionStatus
from src.modules.social.orm import FriendshipORM, FollowORM, ChallengeORM, ChallengeParticipantORM
from src.modules.social.models import FriendshipStatus, ChallengeType


# ============================================================================
# USER DATA - 8 realistic test users
# ============================================================================

USERS = [
    # === MALE USERS ===
    {
        "id": "user-alex-001",
        "display_name": "Alex Chen",
        "first_name": "Alex",
        "last_name": "Chen",
        "email": "alex.chen@example.com",
        "gender": Gender.MALE,
        "date_of_birth": date(1990, 3, 15),
        "height_cm": 178.0,
        "username": "alexfit",
        "bio": "Tech entrepreneur on a fitness journey. 16:8 fasting changed my life!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        "primary_goal": GoalType.WEIGHT_LOSS,
        "fitness_level": FitnessLevel.INTERMEDIATE,
        "dietary_preference": DietaryPreference.LOW_CARB,
        "starting_weight_kg": 92.0,
        "target_weight_kg": 82.0,
        "fasting_protocol": FastingProtocol.SIXTEEN_EIGHT,
        "streak_days": 45,
        "total_xp": 4500,
        "level": 8,
        "fasts_completed": 60,
        "workouts_completed": 35,
    },
    {
        "id": "user-marcus-002",
        "display_name": "Marcus Johnson",
        "first_name": "Marcus",
        "last_name": "Johnson",
        "email": "marcus.j@example.com",
        "gender": Gender.MALE,
        "date_of_birth": date(1985, 7, 22),
        "height_cm": 185.0,
        "username": "marcusj",
        "bio": "Former athlete, now a busy dad. Making time for health with HIIT workouts.",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
        "primary_goal": GoalType.MAINTAIN_WEIGHT,
        "fitness_level": FitnessLevel.ADVANCED,
        "dietary_preference": DietaryPreference.PALEO,
        "starting_weight_kg": 88.0,
        "target_weight_kg": 88.0,
        "fasting_protocol": FastingProtocol.EIGHTEEN_SIX,
        "streak_days": 120,
        "total_xp": 12000,
        "level": 15,
        "fasts_completed": 180,
        "workouts_completed": 95,
    },
    {
        "id": "user-david-003",
        "display_name": "David Park",
        "first_name": "David",
        "last_name": "Park",
        "email": "david.park@example.com",
        "gender": Gender.MALE,
        "date_of_birth": date(1995, 11, 8),
        "height_cm": 172.0,
        "username": "davidp",
        "bio": "Just started my wellness journey. Learning to love the process!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
        "primary_goal": GoalType.MUSCLE_GAIN,
        "fitness_level": FitnessLevel.BEGINNER,
        "dietary_preference": DietaryPreference.NONE,
        "starting_weight_kg": 68.0,
        "target_weight_kg": 75.0,
        "fasting_protocol": FastingProtocol.SIXTEEN_EIGHT,
        "streak_days": 7,
        "total_xp": 850,
        "level": 3,
        "fasts_completed": 12,
        "workouts_completed": 8,
    },
    {
        "id": "user-james-004",
        "display_name": "James Wilson",
        "first_name": "James",
        "last_name": "Wilson",
        "email": "james.w@example.com",
        "gender": Gender.MALE,
        "date_of_birth": date(1988, 5, 30),
        "height_cm": 180.0,
        "username": "jwilson",
        "bio": "Fitness coach helping others achieve their goals. Lead by example!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
        "primary_goal": GoalType.IMPROVE_FITNESS,
        "fitness_level": FitnessLevel.ADVANCED,
        "dietary_preference": DietaryPreference.MEDITERRANEAN,
        "starting_weight_kg": 82.0,
        "target_weight_kg": 80.0,
        "fasting_protocol": FastingProtocol.SIXTEEN_EIGHT,
        "streak_days": 200,
        "total_xp": 25000,
        "level": 22,
        "fasts_completed": 300,
        "workouts_completed": 180,
    },

    # === FEMALE USERS ===
    {
        "id": "user-sarah-005",
        "display_name": "Sarah Miller",
        "first_name": "Sarah",
        "last_name": "Miller",
        "email": "sarah.m@example.com",
        "gender": Gender.FEMALE,
        "date_of_birth": date(1992, 9, 12),
        "height_cm": 165.0,
        "username": "sarahfit",
        "bio": "Yoga enthusiast and mindful eater. Balance is key!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        "primary_goal": GoalType.REDUCE_STRESS,
        "fitness_level": FitnessLevel.INTERMEDIATE,
        "dietary_preference": DietaryPreference.VEGETARIAN,
        "starting_weight_kg": 62.0,
        "target_weight_kg": 58.0,
        "fasting_protocol": FastingProtocol.SIXTEEN_EIGHT,
        "streak_days": 30,
        "total_xp": 3200,
        "level": 6,
        "fasts_completed": 45,
        "workouts_completed": 40,
    },
    {
        "id": "user-emma-006",
        "display_name": "Emma Thompson",
        "first_name": "Emma",
        "last_name": "Thompson",
        "email": "emma.t@example.com",
        "gender": Gender.FEMALE,
        "date_of_birth": date(1987, 2, 28),
        "height_cm": 170.0,
        "username": "emmat",
        "bio": "Working mom crushing my fitness goals one day at a time!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
        "primary_goal": GoalType.INCREASE_ENERGY,
        "fitness_level": FitnessLevel.INTERMEDIATE,
        "dietary_preference": DietaryPreference.KETO,
        "starting_weight_kg": 72.0,
        "target_weight_kg": 65.0,
        "fasting_protocol": FastingProtocol.EIGHTEEN_SIX,
        "streak_days": 60,
        "total_xp": 6500,
        "level": 10,
        "fasts_completed": 90,
        "workouts_completed": 55,
    },
    {
        "id": "user-lisa-007",
        "display_name": "Lisa Garcia",
        "first_name": "Lisa",
        "last_name": "Garcia",
        "email": "lisa.g@example.com",
        "gender": Gender.FEMALE,
        "date_of_birth": date(1998, 6, 5),
        "height_cm": 160.0,
        "username": "lisag",
        "bio": "College student discovering the power of IF. Early bird gets gains!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa",
        "primary_goal": GoalType.BETTER_SLEEP,
        "fitness_level": FitnessLevel.BEGINNER,
        "dietary_preference": DietaryPreference.NONE,
        "starting_weight_kg": 58.0,
        "target_weight_kg": 55.0,
        "fasting_protocol": FastingProtocol.SIXTEEN_EIGHT,
        "streak_days": 14,
        "total_xp": 1200,
        "level": 4,
        "fasts_completed": 20,
        "workouts_completed": 12,
    },
    {
        "id": "user-nina-008",
        "display_name": "Nina Patel",
        "first_name": "Nina",
        "last_name": "Patel",
        "email": "nina.p@example.com",
        "gender": Gender.FEMALE,
        "date_of_birth": date(1983, 12, 18),
        "height_cm": 163.0,
        "username": "ninap",
        "bio": "Doctor and wellness advocate. Practicing what I preach!",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=nina",
        "primary_goal": GoalType.WEIGHT_LOSS,
        "fitness_level": FitnessLevel.ADVANCED,
        "dietary_preference": DietaryPreference.MEDITERRANEAN,
        "starting_weight_kg": 70.0,
        "target_weight_kg": 62.0,
        "fasting_protocol": FastingProtocol.EIGHTEEN_SIX,
        "streak_days": 90,
        "total_xp": 9500,
        "level": 13,
        "fasts_completed": 150,
        "workouts_completed": 100,
    },
]


async def seed_users():
    """Main seeding function."""
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(
            select(IdentityORM).where(IdentityORM.id == USERS[0]["id"])
        )
        if result.scalar_one_or_none():
            print("Users already seeded. Skipping.")
            return

        now = datetime.now(timezone.utc)

        # Get existing workouts for sessions
        workouts_result = await session.execute(select(WorkoutORM.id))
        workout_ids = [row[0] for row in workouts_result.fetchall()]

        print("Creating users and profiles...")

        for user_data in USERS:
            user_id = user_data["id"]

            # 1. Create Identity
            identity = IdentityORM(
                id=user_id,
                identity_type=IdentityType.AUTHENTICATED,
                provider=AuthProvider.ANONYMOUS,
                external_id=f"seed_{user_id}",
                last_active_at=now,
                created_at=now - timedelta(days=user_data["streak_days"] + 30),
                updated_at=now,
            )
            session.add(identity)

            # 2. Create User Profile
            profile = UserProfileORM(
                identity_id=user_id,
                email=user_data["email"],
                display_name=user_data["display_name"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                avatar_url=user_data["avatar_url"],
                date_of_birth=user_data["date_of_birth"],
                gender=user_data["gender"],
                height_cm=user_data["height_cm"],
                created_at=now,
                updated_at=now,
            )
            session.add(profile)

            # 3. Create User Goals
            goals = UserGoalsORM(
                identity_id=user_id,
                primary_goal=user_data["primary_goal"],
                secondary_goals=[GoalType.IMPROVE_FITNESS.value, GoalType.INCREASE_ENERGY.value],
                starting_weight_kg=user_data["starting_weight_kg"],
                target_weight_kg=user_data["target_weight_kg"],
                target_date=date.today() + timedelta(days=90),
                weekly_workout_goal=4,
                daily_step_goal=10000,
                weekly_fasting_goal=5,
                target_fasting_hours=16 if user_data["fasting_protocol"] == FastingProtocol.SIXTEEN_EIGHT else 18,
                created_at=now,
                updated_at=now,
            )
            session.add(goals)

            # 4. Create Health Profile
            health = HealthProfileORM(
                identity_id=user_id,
                conditions=None,
                takes_medication=False,
                fasting_safe=True,
                requires_medical_disclaimer=False,
                created_at=now,
                updated_at=now,
            )
            session.add(health)

            # 5. Create Dietary Profile
            dietary = DietaryProfileORM(
                identity_id=user_id,
                dietary_preference=user_data["dietary_preference"],
                allergies=None,
                intolerances=None,
                calories_target=2000 if user_data["gender"] == Gender.MALE else 1600,
                protein_target_g=150 if user_data["gender"] == Gender.MALE else 100,
                favorite_foods=["chicken", "eggs", "avocado"],
                break_fast_preference="Eggs and avocado" if user_data["dietary_preference"] != DietaryPreference.VEGETARIAN else "Greek yogurt bowl",
                created_at=now,
                updated_at=now,
            )
            session.add(dietary)

            # 6. Create Workout Restrictions
            restrictions = WorkoutRestrictionsORM(
                identity_id=user_id,
                fitness_level=user_data["fitness_level"],
                max_workout_duration_minutes=30 if user_data["fitness_level"] == FitnessLevel.BEGINNER else 45,
                has_gym_access=user_data["fitness_level"] != FitnessLevel.BEGINNER,
                home_equipment=["dumbbells", "mat", "resistance_bands"],
                created_at=now,
                updated_at=now,
            )
            session.add(restrictions)

            # 7. Create Social Profile
            friend_code = secrets.token_hex(4).upper()
            social = SocialProfileORM(
                identity_id=user_id,
                username=user_data["username"],
                bio=user_data["bio"],
                friend_code=friend_code,
                profile_public=True,
                show_streaks=True,
                show_achievements=True,
                show_level=True,
                friends_count=0,  # Will update later
                followers_count=0,
                following_count=0,
                created_at=now,
                updated_at=now,
            )
            session.add(social)

            # 8. Create User Preferences
            prefs = UserPreferencesORM(
                identity_id=user_id,
                unit_system=UnitSystem.METRIC,
                timezone="America/New_York",
                language="en",
                default_fasting_protocol=user_data["fasting_protocol"],
                eating_window_start=time(12, 0),
                eating_window_end=time(20, 0) if user_data["fasting_protocol"] == FastingProtocol.SIXTEEN_EIGHT else time(18, 0),
                workout_reminder_enabled=True,
                preferred_workout_types=["hiit", "strength"],
                dark_mode=False,
                haptic_feedback=True,
                sound_effects=True,
                created_at=now,
                updated_at=now,
            )
            session.add(prefs)

            # 9. Create Onboarding Status
            onboarding = OnboardingStatusORM(
                identity_id=user_id,
                basic_profile_completed=True,
                goals_set=True,
                health_profile_completed=True,
                dietary_preferences_set=True,
                workout_restrictions_set=True,
                bloodwork_uploaded=False,
                first_fast_completed=True,
                first_workout_completed=True,
                first_weight_logged=True,
                onboarding_completed=True,
                completed_at=now - timedelta(days=user_data["streak_days"]),
                created_at=now,
                updated_at=now,
            )
            session.add(onboarding)

            # 10. Create Completed Fasts
            print(f"  Creating {user_data['fasts_completed']} fasts for {user_data['display_name']}...")
            fasting_hours = 16 if user_data["fasting_protocol"] == FastingProtocol.SIXTEEN_EIGHT else 18

            for i in range(user_data["fasts_completed"]):
                fast_start = now - timedelta(days=user_data["fasts_completed"] - i, hours=20)
                fast_end = fast_start + timedelta(hours=fasting_hours)

                fast = TimeWindowORM(
                    id=str(uuid.uuid4()),
                    identity_id=user_id,
                    window_type=WindowType.FAST,
                    state=WindowState.COMPLETED,
                    start_time=fast_start,
                    end_time=fast_end,
                    scheduled_end=fast_end,
                    window_metadata={"protocol": user_data["fasting_protocol"].value, "hours": fasting_hours},
                    created_at=fast_start,
                    updated_at=fast_end,
                )
                session.add(fast)

            # 11. Create Completed Workout Sessions
            if workout_ids:
                print(f"  Creating {user_data['workouts_completed']} workout sessions for {user_data['display_name']}...")

                for i in range(user_data["workouts_completed"]):
                    workout_start = now - timedelta(days=user_data["workouts_completed"] - i, hours=8)
                    duration = randint(15, 30) * 60  # 15-30 minutes in seconds

                    workout_session = WorkoutSessionORM(
                        id=str(uuid.uuid4()),
                        identity_id=user_id,
                        workout_id=choice(workout_ids),
                        status=SessionStatus.COMPLETED,
                        started_at=workout_start,
                        completed_at=workout_start + timedelta(seconds=duration),
                        duration_seconds=duration,
                        calories_burned=randint(100, 300),
                        xp_earned=randint(25, 75),
                    )
                    session.add(workout_session)

            # 12. Create Streaks
            print(f"  Creating streaks for {user_data['display_name']}...")
            for streak_type in StreakType:
                streak = StreakORM(
                    id=str(uuid.uuid4()),
                    identity_id=user_id,
                    streak_type=streak_type,
                    current_count=user_data["streak_days"] if streak_type == StreakType.FASTING else user_data["streak_days"] // 2,
                    longest_count=user_data["streak_days"] if streak_type == StreakType.FASTING else user_data["streak_days"] // 2,
                    last_activity_date=date.today(),
                    started_at=now - timedelta(days=user_data["streak_days"]),
                    created_at=now - timedelta(days=user_data["streak_days"]),
                    updated_at=now,
                )
                session.add(streak)

            # 13. Create User Level
            user_level = UserLevelORM(
                identity_id=user_id,
                current_level=user_data["level"],
                current_xp=user_data["total_xp"] % 500,  # Remaining XP toward next level
                total_xp_earned=user_data["total_xp"],
                created_at=now,
                updated_at=now,
            )
            session.add(user_level)

            # 14. Create XP Transactions (last 10)
            for i in range(10):
                xp_type = choice([
                    XPTransactionType.FAST_COMPLETED,
                    XPTransactionType.WORKOUT_COMPLETED,
                    XPTransactionType.STREAK_BONUS,
                    XPTransactionType.DAILY_LOGIN,
                ])
                xp_amount = 25 if xp_type == XPTransactionType.DAILY_LOGIN else randint(25, 100)

                xp_transaction = XPTransactionORM(
                    id=str(uuid.uuid4()),
                    identity_id=user_id,
                    amount=xp_amount,
                    transaction_type=xp_type,
                    description=f"{xp_type.value} reward",
                    created_at=now - timedelta(days=i),
                )
                session.add(xp_transaction)

        await session.flush()

        # 15. Create Social Relationships
        print("Creating social relationships...")

        # Friendships (create pairs)
        friendships = [
            (USERS[0]["id"], USERS[4]["id"]),  # Alex - Sarah
            (USERS[1]["id"], USERS[5]["id"]),  # Marcus - Emma
            (USERS[2]["id"], USERS[6]["id"]),  # David - Lisa
            (USERS[3]["id"], USERS[7]["id"]),  # James - Nina
            (USERS[0]["id"], USERS[1]["id"]),  # Alex - Marcus
            (USERS[4]["id"], USERS[5]["id"]),  # Sarah - Emma
            (USERS[3]["id"], USERS[1]["id"]),  # James - Marcus (leader connections)
            (USERS[7]["id"], USERS[5]["id"]),  # Nina - Emma (leader connections)
        ]

        for id_a, id_b in friendships:
            # Ensure id_a < id_b lexicographically
            if id_a > id_b:
                id_a, id_b = id_b, id_a

            friendship = FriendshipORM(
                id=str(uuid.uuid4()),
                identity_id_a=id_a,
                identity_id_b=id_b,
                status=FriendshipStatus.ACCEPTED,
                requested_by=id_a,
                accepted_at=now - timedelta(days=randint(5, 30)),
                created_at=now - timedelta(days=randint(30, 60)),
                updated_at=now,
            )
            session.add(friendship)

        # Follows (one-way - followers follow leaders)
        leaders = [USERS[3]["id"], USERS[7]["id"], USERS[1]["id"]]  # James, Nina, Marcus
        followers_list = [u["id"] for u in USERS if u["id"] not in leaders]

        for leader_id in leaders:
            for follower_id in followers_list:
                if follower_id != leader_id:
                    follow = FollowORM(
                        id=str(uuid.uuid4()),
                        follower_id=follower_id,
                        following_id=leader_id,
                        created_at=now - timedelta(days=randint(1, 30)),
                    )
                    session.add(follow)

        # 16. Create Challenges
        print("Creating challenges...")

        challenges_data = [
            {
                "name": "30-Day Fasting Challenge",
                "description": "Complete 30 consecutive days of fasting. Build the habit!",
                "challenge_type": ChallengeType.FASTING_STREAK,
                "goal_value": 30.0,
                "goal_unit": "days",
                "days_offset": -10,  # Started 10 days ago
                "duration_days": 30,
                "created_by": USERS[3]["id"],  # James
                "participants": [USERS[0]["id"], USERS[1]["id"], USERS[4]["id"], USERS[5]["id"], USERS[3]["id"]],
            },
            {
                "name": "Weekly Warrior",
                "description": "Complete 20 workouts this month. Push your limits!",
                "challenge_type": ChallengeType.WORKOUT_COUNT,
                "goal_value": 20.0,
                "goal_unit": "workouts",
                "days_offset": -5,  # Started 5 days ago
                "duration_days": 30,
                "created_by": USERS[1]["id"],  # Marcus
                "participants": [USERS[0]["id"], USERS[1]["id"], USERS[2]["id"], USERS[3]["id"], USERS[6]["id"]],
            },
            {
                "name": "XP Sprint",
                "description": "Earn 1000 XP in one week. Every action counts!",
                "challenge_type": ChallengeType.TOTAL_XP,
                "goal_value": 1000.0,
                "goal_unit": "XP",
                "days_offset": -2,  # Started 2 days ago
                "duration_days": 7,
                "created_by": USERS[7]["id"],  # Nina
                "participants": [USERS[4]["id"], USERS[5]["id"], USERS[6]["id"], USERS[7]["id"]],
            },
        ]

        for challenge_data in challenges_data:
            start_date = date.today() + timedelta(days=challenge_data["days_offset"])
            end_date = start_date + timedelta(days=challenge_data["duration_days"])

            challenge = ChallengeORM(
                id=str(uuid.uuid4()),
                name=challenge_data["name"],
                description=challenge_data["description"],
                challenge_type=challenge_data["challenge_type"],
                goal_value=challenge_data["goal_value"],
                goal_unit=challenge_data["goal_unit"],
                start_date=start_date,
                end_date=end_date,
                created_by=challenge_data["created_by"],
                join_code=secrets.token_hex(4).upper(),
                is_public=True,
                max_participants=50,
                created_at=now + timedelta(days=challenge_data["days_offset"]),
                updated_at=now,
            )
            session.add(challenge)
            await session.flush()

            # Add participants with progress
            for i, participant_id in enumerate(challenge_data["participants"]):
                # Find user data for this participant
                user = next(u for u in USERS if u["id"] == participant_id)

                # Calculate progress based on user's level (more active = more progress)
                if challenge_data["challenge_type"] == ChallengeType.FASTING_STREAK:
                    progress = min(abs(challenge_data["days_offset"]), user["streak_days"])
                elif challenge_data["challenge_type"] == ChallengeType.WORKOUT_COUNT:
                    progress = min(abs(challenge_data["days_offset"]) * 0.8, user["workouts_completed"] * 0.1)
                else:
                    progress = user["total_xp"] * 0.02

                participant = ChallengeParticipantORM(
                    id=str(uuid.uuid4()),
                    challenge_id=challenge.id,
                    identity_id=participant_id,
                    joined_at=now + timedelta(days=challenge_data["days_offset"]),
                    current_progress=float(progress),
                    completed=progress >= challenge_data["goal_value"],
                    completed_at=now if progress >= challenge_data["goal_value"] else None,
                    rank=i + 1,
                )
                session.add(participant)

        # Update friend counts
        print("Updating friend counts...")
        for user in USERS:
            user_id = user["id"]

            # Count friendships
            friend_count = sum(
                1 for f in friendships
                if user_id in (f[0] if f[0] < f[1] else f[1], f[1] if f[0] < f[1] else f[0])
            )

            # Count following
            following_count = sum(1 for l in leaders if user_id in followers_list)

            # Count followers
            follower_count = sum(1 for _ in followers_list) if user_id in leaders else 0

            # Update social profile
            await session.execute(
                SocialProfileORM.__table__.update()
                .where(SocialProfileORM.identity_id == user_id)
                .values(
                    friends_count=friend_count,
                    followers_count=follower_count,
                    following_count=following_count,
                )
            )

        await session.commit()
        print(f"\nSuccessfully seeded {len(USERS)} users with complete profiles!")
        print("Seeded data includes:")
        print("  - User profiles (personal info, goals, health, dietary, workout restrictions)")
        print("  - Social profiles (usernames, bios, friend codes)")
        print("  - Completed fasts and workout sessions")
        print("  - Streaks and XP/levels")
        print("  - Friendships and follow relationships")
        print("  - Active challenges with participants")


if __name__ == "__main__":
    asyncio.run(seed_users())
