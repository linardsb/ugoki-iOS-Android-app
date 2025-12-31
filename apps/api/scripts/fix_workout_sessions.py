"""Fix old workout sessions with incorrect duration and calories data."""

import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.session import AsyncSessionLocal
from src.modules.content.orm import WorkoutSessionORM
from src.modules.content.models import SessionStatus


async def fix_workout_sessions():
    """Update all completed sessions with correct duration and calories."""
    async with AsyncSessionLocal() as session:
        # Get all completed sessions with their workouts
        result = await session.execute(
            select(WorkoutSessionORM)
            .options(selectinload(WorkoutSessionORM.workout))
            .where(WorkoutSessionORM.status == SessionStatus.COMPLETED)
        )
        sessions = result.scalars().all()

        if not sessions:
            print("No completed sessions found.")
            return

        fixed_count = 0
        for ws in sessions:
            if not ws.workout:
                print(f"Session {ws.id}: No workout linked, skipping")
                continue

            old_duration = ws.duration_seconds
            old_calories = ws.calories_burned

            # Calculate correct values from workout
            correct_duration = ws.workout.duration_minutes * 60
            correct_calories = ws.workout.calories_estimate

            # Check if needs fixing
            needs_fix = False
            if old_duration is None or old_duration < correct_duration * 0.5:
                ws.duration_seconds = correct_duration
                needs_fix = True

            if old_calories is None or old_calories < correct_calories * 0.5:
                ws.calories_burned = correct_calories
                needs_fix = True

            if needs_fix:
                fixed_count += 1
                print(f"Fixed session {ws.id} ({ws.workout.name}):")
                print(f"  Duration: {old_duration}s -> {ws.duration_seconds}s ({ws.duration_seconds // 60} min)")
                print(f"  Calories: {old_calories} -> {ws.calories_burned}")

        if fixed_count > 0:
            await session.commit()
            print(f"\nSuccessfully fixed {fixed_count} workout sessions!")
        else:
            print("All sessions already have correct data.")


if __name__ == "__main__":
    asyncio.run(fix_workout_sessions())
