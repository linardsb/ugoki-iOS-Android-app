"""AI Coach Skill System.

Implements progressive prompt disclosure - skills are loaded dynamically
based on query type to keep context focused and within token budget.

Usage:
    from src.modules.ai_coach.skills import route_query, get_skill_prompts

    # Route a query to determine relevant skills
    skills = route_query("How should I structure my HIIT workout?")
    # Returns: ["workout"]

    # Get the combined skill prompts
    prompt = get_skill_prompts(skills)
    # Returns the workout skill prompt text
"""

from .router import (
    route_query,
    get_skill_token_estimate,
    get_all_skill_names,
    get_skill_description,
    SKILLS,
    MAX_SKILLS,
)

# Import skill modules for direct access if needed
from . import workout, fasting, nutrition, motivation, research


def get_skill_prompts(skill_names: list[str]) -> str:
    """
    Get combined prompt text for the given skills.

    Args:
        skill_names: List of skill names to include

    Returns:
        Combined skill prompt text, or empty string if no skills
    """
    if not skill_names:
        return ""

    prompts = []
    for name in skill_names:
        if name in SKILLS:
            prompts.append(SKILLS[name].PROMPT)

    if prompts:
        header = "\n# Activated Expertise\n\nThe following specialized knowledge is relevant to this query:\n"
        return header + "\n---\n".join(prompts)

    return ""


def get_skill_metadata(skill_name: str) -> dict:
    """
    Get metadata for a specific skill.

    Args:
        skill_name: The skill name

    Returns:
        Skill metadata dict or empty dict if not found
    """
    if skill_name in SKILLS:
        return SKILLS[skill_name].METADATA
    return {}


__all__ = [
    "route_query",
    "get_skill_prompts",
    "get_skill_token_estimate",
    "get_all_skill_names",
    "get_skill_description",
    "get_skill_metadata",
    "SKILLS",
    "MAX_SKILLS",
    # Individual skill modules
    "workout",
    "fasting",
    "nutrition",
    "motivation",
    "research",
]
