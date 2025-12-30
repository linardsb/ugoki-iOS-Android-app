"""Seed default achievements for the progression system."""

import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import AsyncSessionLocal
from src.modules.progression.orm import AchievementORM
from src.modules.progression.models import AchievementType


DEFAULT_ACHIEVEMENTS = [
    # === STREAK ACHIEVEMENTS ===
    {
        "name": "Getting Started",
        "description": "Complete a 3-day streak",
        "achievement_type": AchievementType.STREAK,
        "xp_reward": 50,
        "icon": "flame",
        "requirement_value": 3,
    },
    {
        "name": "Week Warrior",
        "description": "Complete a 7-day streak",
        "achievement_type": AchievementType.STREAK,
        "xp_reward": 100,
        "icon": "flame",
        "requirement_value": 7,
    },
    {
        "name": "Fortnight Fighter",
        "description": "Complete a 14-day streak",
        "achievement_type": AchievementType.STREAK,
        "xp_reward": 200,
        "icon": "flame",
        "requirement_value": 14,
    },
    {
        "name": "Monthly Master",
        "description": "Complete a 30-day streak",
        "achievement_type": AchievementType.STREAK,
        "xp_reward": 500,
        "icon": "trophy",
        "requirement_value": 30,
    },
    {
        "name": "Unstoppable",
        "description": "Complete a 60-day streak",
        "achievement_type": AchievementType.STREAK,
        "xp_reward": 1000,
        "icon": "trophy",
        "requirement_value": 60,
    },
    {
        "name": "Legendary",
        "description": "Complete a 100-day streak",
        "achievement_type": AchievementType.STREAK,
        "xp_reward": 2500,
        "icon": "crown",
        "requirement_value": 100,
        "is_hidden": True,
    },

    # === FASTING ACHIEVEMENTS ===
    {
        "name": "First Fast",
        "description": "Complete your first fast",
        "achievement_type": AchievementType.FASTING,
        "xp_reward": 25,
        "icon": "timer",
        "requirement_value": 1,
    },
    {
        "name": "Fasting Enthusiast",
        "description": "Complete 10 fasts",
        "achievement_type": AchievementType.FASTING,
        "xp_reward": 100,
        "icon": "timer",
        "requirement_value": 10,
    },
    {
        "name": "Fasting Pro",
        "description": "Complete 50 fasts",
        "achievement_type": AchievementType.FASTING,
        "xp_reward": 300,
        "icon": "timer",
        "requirement_value": 50,
    },
    {
        "name": "Fasting Master",
        "description": "Complete 100 fasts",
        "achievement_type": AchievementType.FASTING,
        "xp_reward": 750,
        "icon": "star",
        "requirement_value": 100,
    },

    # === WORKOUT ACHIEVEMENTS ===
    {
        "name": "First Sweat",
        "description": "Complete your first workout",
        "achievement_type": AchievementType.WORKOUT,
        "xp_reward": 25,
        "icon": "dumbbell",
        "requirement_value": 1,
    },
    {
        "name": "Workout Warrior",
        "description": "Complete 10 workouts",
        "achievement_type": AchievementType.WORKOUT,
        "xp_reward": 100,
        "icon": "dumbbell",
        "requirement_value": 10,
    },
    {
        "name": "Fitness Fanatic",
        "description": "Complete 50 workouts",
        "achievement_type": AchievementType.WORKOUT,
        "xp_reward": 300,
        "icon": "muscle",
        "requirement_value": 50,
    },
    {
        "name": "Iron Champion",
        "description": "Complete 100 workouts",
        "achievement_type": AchievementType.WORKOUT,
        "xp_reward": 750,
        "icon": "medal",
        "requirement_value": 100,
    },

    # === WEIGHT ACHIEVEMENTS ===
    {
        "name": "First Weigh-In",
        "description": "Log your weight for the first time",
        "achievement_type": AchievementType.WEIGHT,
        "xp_reward": 25,
        "icon": "scale",
        "requirement_value": 1,
    },
    {
        "name": "Consistent Tracker",
        "description": "Log your weight 30 times",
        "achievement_type": AchievementType.WEIGHT,
        "xp_reward": 150,
        "icon": "scale",
        "requirement_value": 30,
    },
    {
        "name": "Data Driven",
        "description": "Log your weight 100 times",
        "achievement_type": AchievementType.WEIGHT,
        "xp_reward": 400,
        "icon": "chart",
        "requirement_value": 100,
    },

    # === SPECIAL ACHIEVEMENTS ===
    {
        "name": "Welcome to UGOKI",
        "description": "Start your wellness journey",
        "achievement_type": AchievementType.SPECIAL,
        "xp_reward": 50,
        "icon": "rocket",
        "requirement_value": 1,
    },
    {
        "name": "Level 5",
        "description": "Reach level 5",
        "achievement_type": AchievementType.SPECIAL,
        "xp_reward": 100,
        "icon": "star",
        "requirement_value": 5,
    },
    {
        "name": "Level 10",
        "description": "Reach level 10",
        "achievement_type": AchievementType.SPECIAL,
        "xp_reward": 250,
        "icon": "star",
        "requirement_value": 10,
    },
    {
        "name": "Level 25",
        "description": "Reach level 25",
        "achievement_type": AchievementType.SPECIAL,
        "xp_reward": 500,
        "icon": "crown",
        "requirement_value": 25,
        "is_hidden": True,
    },
]


async def seed_achievements(session: AsyncSession) -> int:
    """Seed default achievements. Returns count of new achievements added."""
    # Check existing achievements
    result = await session.execute(select(AchievementORM.name))
    existing_names = {row[0] for row in result.fetchall()}

    added = 0
    for achievement_data in DEFAULT_ACHIEVEMENTS:
        if achievement_data["name"] in existing_names:
            continue

        achievement = AchievementORM(
            id=str(uuid.uuid4()),
            name=achievement_data["name"],
            description=achievement_data["description"],
            achievement_type=achievement_data["achievement_type"],
            xp_reward=achievement_data["xp_reward"],
            icon=achievement_data.get("icon"),
            requirement_value=achievement_data["requirement_value"],
            is_hidden=achievement_data.get("is_hidden", False),
        )
        session.add(achievement)
        added += 1

    await session.commit()
    return added


async def main() -> None:
    """Run seeding."""
    async with AsyncSessionLocal() as session:
        count = await seed_achievements(session)
        print(f"Seeded {count} achievements")


if __name__ == "__main__":
    asyncio.run(main())
