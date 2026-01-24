"""Skill router for the AI Coach.

Classifies user queries and determines which skills to activate
for progressive prompt disclosure.
"""

import logging
from typing import Optional

from . import workout, fasting, nutrition, motivation, research

logger = logging.getLogger(__name__)

# Skill registry
SKILLS = {
    "workout": workout,
    "fasting": fasting,
    "nutrition": nutrition,
    "motivation": motivation,
    "research": research,
}

# Maximum number of skills to activate per query
# Keeps context focused and within token budget
MAX_SKILLS = 2


def route_query(
    query: str,
    user_context: Optional[dict] = None,
) -> list[str]:
    """
    Determine which skills to activate based on the user's query.

    Uses keyword matching for efficiency. Can be upgraded to a
    classifier model for better accuracy in the future.

    Args:
        query: The user's message
        user_context: Optional context about the user (for future use)

    Returns:
        List of skill names to activate (max MAX_SKILLS)
    """
    query_lower = query.lower()
    activated_skills: list[tuple[str, int]] = []  # (skill_name, match_count)

    for skill_name, skill_module in SKILLS.items():
        triggers = skill_module.METADATA.get("triggers", [])
        match_count = sum(1 for trigger in triggers if trigger.lower() in query_lower)

        if match_count > 0:
            activated_skills.append((skill_name, match_count))

    # Sort by match count (most relevant first)
    activated_skills.sort(key=lambda x: x[1], reverse=True)

    # Take top N skills
    result = [skill for skill, _ in activated_skills[:MAX_SKILLS]]

    if result:
        logger.debug(f"Query routed to skills: {result}")
    else:
        logger.debug("No specific skills matched, using general coaching")

    return result


def get_skill_token_estimate(skills: list[str]) -> int:
    """
    Estimate total tokens for the given skills.

    Args:
        skills: List of skill names

    Returns:
        Estimated token count
    """
    total = 0
    for skill_name in skills:
        if skill_name in SKILLS:
            total += SKILLS[skill_name].METADATA.get("max_tokens", 400)
    return total


def get_all_skill_names() -> list[str]:
    """Return list of all available skill names."""
    return list(SKILLS.keys())


def get_skill_description(skill_name: str) -> str:
    """Get the description for a skill."""
    if skill_name in SKILLS:
        return SKILLS[skill_name].METADATA.get("description", "")
    return ""
