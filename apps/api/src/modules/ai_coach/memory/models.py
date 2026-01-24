"""Pydantic models for the user memory system."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MemoryType(str, Enum):
    """Types of extractable memories."""

    FACT = "fact"  # User-stated facts ("I have a bad knee")
    PREFERENCE = "preference"  # Likes/dislikes ("I prefer morning workouts")
    GOAL = "goal"  # Objectives ("I want to lose 10 lbs")
    CONSTRAINT = "constraint"  # Limitations ("I only have 20 minutes")


class MemoryCategory(str, Enum):
    """Categories for organizing memories."""

    # Physical constraints
    INJURY = "injury"
    MEDICAL = "medical"
    PHYSICAL_LIMITATION = "physical_limitation"

    # Time and schedule
    SCHEDULE = "schedule"
    AVAILABILITY = "availability"

    # Equipment and environment
    EQUIPMENT = "equipment"
    LOCATION = "location"

    # Fitness level
    FITNESS_LEVEL = "fitness_level"
    EXPERIENCE = "experience"

    # Preferences
    WORKOUT_PREFERENCE = "workout_preference"
    FOOD_PREFERENCE = "food_preference"
    COACHING_STYLE = "coaching_style"

    # Goals
    WEIGHT_GOAL = "weight_goal"
    FITNESS_GOAL = "fitness_goal"
    HEALTH_GOAL = "health_goal"

    # Lifestyle
    WORK = "work"
    SLEEP = "sleep"
    STRESS = "stress"

    # General
    GENERAL = "general"


class ExtractedMemory(BaseModel):
    """A memory extracted from conversation."""

    memory_type: MemoryType
    category: MemoryCategory
    content: str = Field(..., min_length=1, max_length=500)
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)


class UserMemory(BaseModel):
    """Full user memory with metadata."""

    id: UUID
    identity_id: str
    memory_type: MemoryType
    category: MemoryCategory
    content: str
    confidence: float
    source_session_id: Optional[str] = None
    extracted_at: datetime
    verified_by_user: bool = False
    is_active: bool = True


class MemoryExtractionResult(BaseModel):
    """Result of memory extraction from a conversation."""

    memories: list[ExtractedMemory]
    session_id: str
    extracted_at: datetime


# Category mappings for query-based loading
WORKOUT_CATEGORIES = [
    MemoryCategory.INJURY,
    MemoryCategory.EQUIPMENT,
    MemoryCategory.SCHEDULE,
    MemoryCategory.FITNESS_LEVEL,
    MemoryCategory.PHYSICAL_LIMITATION,
    MemoryCategory.WORKOUT_PREFERENCE,
    MemoryCategory.FITNESS_GOAL,
]

FASTING_CATEGORIES = [
    MemoryCategory.MEDICAL,
    MemoryCategory.SCHEDULE,
    MemoryCategory.HEALTH_GOAL,
    MemoryCategory.WORK,
    MemoryCategory.SLEEP,
]

NUTRITION_CATEGORIES = [
    MemoryCategory.FOOD_PREFERENCE,
    MemoryCategory.MEDICAL,
    MemoryCategory.WEIGHT_GOAL,
    MemoryCategory.SCHEDULE,
]

MOTIVATION_CATEGORIES = [
    MemoryCategory.FITNESS_GOAL,
    MemoryCategory.HEALTH_GOAL,
    MemoryCategory.WEIGHT_GOAL,
    MemoryCategory.STRESS,
    MemoryCategory.COACHING_STYLE,
]

# Map skill names to relevant categories
SKILL_TO_CATEGORIES = {
    "workout": WORKOUT_CATEGORIES,
    "fasting": FASTING_CATEGORIES,
    "nutrition": NUTRITION_CATEGORIES,
    "motivation": MOTIVATION_CATEGORIES,
    "research": [],  # Research skill doesn't need specific memories
}
