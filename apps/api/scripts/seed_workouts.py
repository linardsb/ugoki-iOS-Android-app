"""Seed script for workouts and exercises."""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from src.db.session import AsyncSessionLocal
from src.modules.content.orm import WorkoutCategoryORM, WorkoutORM, ExerciseORM


CATEGORIES = [
    {"name": "HIIT", "description": "High-intensity interval training for maximum calorie burn", "icon": "flame"},
    {"name": "Strength", "description": "Build muscle and increase power", "icon": "barbell"},
    {"name": "Cardio", "description": "Improve cardiovascular health and endurance", "icon": "heart-pulse"},
    {"name": "Flexibility", "description": "Increase mobility and reduce injury risk", "icon": "person-simple-walk"},
    {"name": "Recovery", "description": "Rest and restore your body", "icon": "moon"},
]

WORKOUTS = [
    # HIIT Workouts
    {
        "name": "Quick HIIT Blast",
        "description": "A fast-paced 10-minute workout to get your heart pumping",
        "category": "HIIT",
        "workout_type": "hiit",
        "difficulty": "beginner",
        "duration_minutes": 10,
        "calories_estimate": 120,
        "is_featured": True,
        "exercises": [
            {"name": "Jumping Jacks", "duration_seconds": 30, "rest_seconds": 10, "order": 1},
            {"name": "High Knees", "duration_seconds": 30, "rest_seconds": 10, "order": 2},
            {"name": "Burpees", "duration_seconds": 30, "rest_seconds": 10, "order": 3},
            {"name": "Mountain Climbers", "duration_seconds": 30, "rest_seconds": 10, "order": 4},
            {"name": "Squat Jumps", "duration_seconds": 30, "rest_seconds": 10, "order": 5},
        ],
    },
    {
        "name": "Tabata Torch",
        "description": "Classic Tabata protocol: 20 seconds work, 10 seconds rest",
        "category": "HIIT",
        "workout_type": "hiit",
        "difficulty": "intermediate",
        "duration_minutes": 15,
        "calories_estimate": 180,
        "is_featured": True,
        "exercises": [
            {"name": "Burpees", "duration_seconds": 20, "rest_seconds": 10, "reps": 8, "order": 1},
            {"name": "Jump Squats", "duration_seconds": 20, "rest_seconds": 10, "reps": 8, "order": 2},
            {"name": "Push-ups", "duration_seconds": 20, "rest_seconds": 10, "reps": 8, "order": 3},
            {"name": "Plank Jacks", "duration_seconds": 20, "rest_seconds": 10, "reps": 8, "order": 4},
        ],
    },
    {
        "name": "HIIT Inferno",
        "description": "Advanced high-intensity session for serious calorie burning",
        "category": "HIIT",
        "workout_type": "hiit",
        "difficulty": "advanced",
        "duration_minutes": 20,
        "calories_estimate": 280,
        "is_featured": False,
        "exercises": [
            {"name": "Box Jumps", "duration_seconds": 40, "rest_seconds": 20, "order": 1},
            {"name": "Burpee Box Jumps", "duration_seconds": 40, "rest_seconds": 20, "order": 2},
            {"name": "Tuck Jumps", "duration_seconds": 40, "rest_seconds": 20, "order": 3},
            {"name": "Sprint in Place", "duration_seconds": 40, "rest_seconds": 20, "order": 4},
            {"name": "Lateral Bounds", "duration_seconds": 40, "rest_seconds": 20, "order": 5},
        ],
    },
    # Strength Workouts
    {
        "name": "Bodyweight Basics",
        "description": "Foundation strength workout using just your body",
        "category": "Strength",
        "workout_type": "strength",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "calories_estimate": 100,
        "is_featured": True,
        "exercises": [
            {"name": "Push-ups", "reps": 10, "rest_seconds": 30, "order": 1},
            {"name": "Bodyweight Squats", "reps": 15, "rest_seconds": 30, "order": 2},
            {"name": "Plank", "duration_seconds": 30, "rest_seconds": 30, "order": 3},
            {"name": "Lunges", "reps": 10, "rest_seconds": 30, "order": 4},
            {"name": "Glute Bridges", "reps": 15, "rest_seconds": 30, "order": 5},
        ],
    },
    {
        "name": "Upper Body Power",
        "description": "Target your chest, back, shoulders, and arms",
        "category": "Strength",
        "workout_type": "strength",
        "difficulty": "intermediate",
        "duration_minutes": 20,
        "calories_estimate": 150,
        "is_featured": False,
        "exercises": [
            {"name": "Diamond Push-ups", "reps": 12, "rest_seconds": 45, "order": 1},
            {"name": "Pike Push-ups", "reps": 10, "rest_seconds": 45, "order": 2},
            {"name": "Tricep Dips", "reps": 15, "rest_seconds": 45, "order": 3},
            {"name": "Superman Hold", "duration_seconds": 30, "rest_seconds": 45, "order": 4},
            {"name": "Plank Shoulder Taps", "reps": 20, "rest_seconds": 45, "order": 5},
        ],
    },
    {
        "name": "Lower Body Burner",
        "description": "Build strong legs and glutes",
        "category": "Strength",
        "workout_type": "strength",
        "difficulty": "intermediate",
        "duration_minutes": 20,
        "calories_estimate": 160,
        "is_featured": True,
        "exercises": [
            {"name": "Jump Squats", "reps": 15, "rest_seconds": 45, "order": 1},
            {"name": "Walking Lunges", "reps": 20, "rest_seconds": 45, "order": 2},
            {"name": "Single Leg Deadlifts", "reps": 10, "rest_seconds": 45, "order": 3},
            {"name": "Wall Sit", "duration_seconds": 45, "rest_seconds": 30, "order": 4},
            {"name": "Calf Raises", "reps": 20, "rest_seconds": 30, "order": 5},
        ],
    },
    # Cardio Workouts
    {
        "name": "Cardio Kickstart",
        "description": "Easy cardio to get your blood flowing",
        "category": "Cardio",
        "workout_type": "cardio",
        "difficulty": "beginner",
        "duration_minutes": 12,
        "calories_estimate": 90,
        "is_featured": False,
        "exercises": [
            {"name": "March in Place", "duration_seconds": 60, "rest_seconds": 15, "order": 1},
            {"name": "Step Touches", "duration_seconds": 60, "rest_seconds": 15, "order": 2},
            {"name": "Arm Circles", "duration_seconds": 45, "rest_seconds": 15, "order": 3},
            {"name": "Knee Lifts", "duration_seconds": 60, "rest_seconds": 15, "order": 4},
        ],
    },
    {
        "name": "Dance Cardio Party",
        "description": "Fun dance moves to burn calories while having a blast",
        "category": "Cardio",
        "workout_type": "cardio",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "calories_estimate": 130,
        "is_featured": True,
        "exercises": [
            {"name": "Side Steps", "duration_seconds": 45, "rest_seconds": 15, "order": 1},
            {"name": "Grapevine", "duration_seconds": 45, "rest_seconds": 15, "order": 2},
            {"name": "Hip Circles", "duration_seconds": 45, "rest_seconds": 15, "order": 3},
            {"name": "Salsa Steps", "duration_seconds": 45, "rest_seconds": 15, "order": 4},
            {"name": "Freestyle", "duration_seconds": 60, "rest_seconds": 15, "order": 5},
        ],
    },
    {
        "name": "Cardio Crusher",
        "description": "Intense cardio to push your limits",
        "category": "Cardio",
        "workout_type": "cardio",
        "difficulty": "advanced",
        "duration_minutes": 25,
        "calories_estimate": 300,
        "is_featured": False,
        "exercises": [
            {"name": "Sprint in Place", "duration_seconds": 60, "rest_seconds": 20, "order": 1},
            {"name": "Burpees", "duration_seconds": 45, "rest_seconds": 20, "order": 2},
            {"name": "Jump Rope (Imaginary)", "duration_seconds": 60, "rest_seconds": 20, "order": 3},
            {"name": "Mountain Climbers", "duration_seconds": 45, "rest_seconds": 20, "order": 4},
            {"name": "Star Jumps", "duration_seconds": 45, "rest_seconds": 20, "order": 5},
        ],
    },
    # Flexibility Workouts
    {
        "name": "Morning Stretch",
        "description": "Wake up your body with gentle stretches",
        "category": "Flexibility",
        "workout_type": "flexibility",
        "difficulty": "beginner",
        "duration_minutes": 10,
        "calories_estimate": 30,
        "is_featured": True,
        "exercises": [
            {"name": "Neck Rolls", "duration_seconds": 30, "order": 1},
            {"name": "Shoulder Stretch", "duration_seconds": 30, "order": 2},
            {"name": "Cat-Cow", "duration_seconds": 45, "order": 3},
            {"name": "Child's Pose", "duration_seconds": 45, "order": 4},
            {"name": "Standing Forward Fold", "duration_seconds": 45, "order": 5},
        ],
    },
    {
        "name": "Full Body Flexibility",
        "description": "Comprehensive stretching for all major muscle groups",
        "category": "Flexibility",
        "workout_type": "flexibility",
        "difficulty": "intermediate",
        "duration_minutes": 20,
        "calories_estimate": 50,
        "is_featured": False,
        "exercises": [
            {"name": "Hip Flexor Stretch", "duration_seconds": 45, "order": 1},
            {"name": "Pigeon Pose", "duration_seconds": 60, "order": 2},
            {"name": "Hamstring Stretch", "duration_seconds": 45, "order": 3},
            {"name": "Quad Stretch", "duration_seconds": 45, "order": 4},
            {"name": "Spinal Twist", "duration_seconds": 45, "order": 5},
            {"name": "Chest Opener", "duration_seconds": 45, "order": 6},
        ],
    },
    {
        "name": "Yoga Flow",
        "description": "Flowing yoga sequence for mind and body",
        "category": "Flexibility",
        "workout_type": "flexibility",
        "difficulty": "intermediate",
        "duration_minutes": 25,
        "calories_estimate": 80,
        "is_featured": True,
        "exercises": [
            {"name": "Sun Salutation A", "duration_seconds": 90, "order": 1},
            {"name": "Warrior I", "duration_seconds": 45, "order": 2},
            {"name": "Warrior II", "duration_seconds": 45, "order": 3},
            {"name": "Triangle Pose", "duration_seconds": 45, "order": 4},
            {"name": "Downward Dog", "duration_seconds": 60, "order": 5},
            {"name": "Savasana", "duration_seconds": 120, "order": 6},
        ],
    },
    # Recovery Workouts
    {
        "name": "Active Recovery",
        "description": "Light movement to aid muscle recovery",
        "category": "Recovery",
        "workout_type": "recovery",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "calories_estimate": 40,
        "is_featured": False,
        "exercises": [
            {"name": "Gentle Walking", "duration_seconds": 120, "order": 1},
            {"name": "Arm Swings", "duration_seconds": 45, "order": 2},
            {"name": "Leg Swings", "duration_seconds": 45, "order": 3},
            {"name": "Hip Circles", "duration_seconds": 45, "order": 4},
            {"name": "Deep Breathing", "duration_seconds": 60, "order": 5},
        ],
    },
    {
        "name": "Foam Rolling Session",
        "description": "Self-massage to release muscle tension",
        "category": "Recovery",
        "workout_type": "recovery",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "calories_estimate": 25,
        "is_featured": True,
        "exercises": [
            {"name": "IT Band Roll", "duration_seconds": 60, "order": 1},
            {"name": "Quad Roll", "duration_seconds": 60, "order": 2},
            {"name": "Hamstring Roll", "duration_seconds": 60, "order": 3},
            {"name": "Upper Back Roll", "duration_seconds": 60, "order": 4},
            {"name": "Glute Roll", "duration_seconds": 60, "order": 5},
        ],
    },
    {
        "name": "Meditation & Breathwork",
        "description": "Calm your mind and restore your energy",
        "category": "Recovery",
        "workout_type": "recovery",
        "difficulty": "beginner",
        "duration_minutes": 10,
        "calories_estimate": 15,
        "is_featured": False,
        "exercises": [
            {"name": "Box Breathing", "duration_seconds": 120, "order": 1},
            {"name": "Body Scan", "duration_seconds": 180, "order": 2},
            {"name": "Gratitude Meditation", "duration_seconds": 180, "order": 3},
        ],
    },
    {
        "name": "Post-Workout Cooldown",
        "description": "Essential cooldown after intense workouts",
        "category": "Recovery",
        "workout_type": "recovery",
        "difficulty": "beginner",
        "duration_minutes": 8,
        "calories_estimate": 20,
        "is_featured": False,
        "exercises": [
            {"name": "Slow Walking", "duration_seconds": 60, "order": 1},
            {"name": "Standing Quad Stretch", "duration_seconds": 30, "order": 2},
            {"name": "Standing Hamstring Stretch", "duration_seconds": 30, "order": 3},
            {"name": "Shoulder Stretch", "duration_seconds": 30, "order": 4},
            {"name": "Deep Breaths", "duration_seconds": 60, "order": 5},
        ],
    },
]


async def seed_workouts():
    """Seed workout categories, workouts, and exercises."""
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(WorkoutCategoryORM.name))
        existing = result.scalars().all()
        if existing:
            print(f"Workouts already seeded ({len(existing)} categories found)")
            return

        now = datetime.now(timezone.utc)

        # Create categories
        category_map = {}
        for cat in CATEGORIES:
            category_orm = WorkoutCategoryORM(
                id=str(uuid.uuid4()),
                name=cat["name"],
                description=cat["description"],
                icon=cat["icon"],
            )
            session.add(category_orm)
            category_map[cat["name"]] = category_orm

        await session.flush()

        # Create workouts and exercises
        workout_count = 0
        exercise_count = 0

        for workout in WORKOUTS:
            category = category_map[workout["category"]]

            workout_orm = WorkoutORM(
                id=str(uuid.uuid4()),
                name=workout["name"],
                description=workout["description"],
                workout_type=workout["workout_type"],
                difficulty=workout["difficulty"],
                duration_minutes=workout["duration_minutes"],
                calories_estimate=workout["calories_estimate"],
                is_featured=workout["is_featured"],
                category_id=category.id,
                created_at=now,
                updated_at=now,
            )
            session.add(workout_orm)
            await session.flush()
            workout_count += 1

            # Create exercises for this workout
            for exercise in workout["exercises"]:
                # Calculate duration: use explicit duration, or estimate from reps (3 sec per rep)
                duration = exercise.get("duration_seconds") or (exercise.get("reps", 10) * 3)
                exercise_orm = ExerciseORM(
                    id=str(uuid.uuid4()),
                    workout_id=workout_orm.id,
                    name=exercise["name"],
                    duration_seconds=duration,
                    rest_seconds=exercise.get("rest_seconds", 0),
                    order=exercise["order"],
                )
                session.add(exercise_orm)
                exercise_count += 1

        await session.commit()
        print(f"Successfully seeded {workout_count} workouts with {exercise_count} exercises!")


if __name__ == "__main__":
    asyncio.run(seed_workouts())
