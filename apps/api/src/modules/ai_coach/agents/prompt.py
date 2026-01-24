"""System prompt for UGOKI AI Wellness Coach.

This module manages the AI Coach's system prompt, integrating:
- Constitution (core values and behavioral guidelines)
- Personality variants (motivational, calm, tough, friendly)
- Skills (loaded dynamically based on query type)
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

# Load constitution from file
_CONSTITUTION_PATH = Path(__file__).parent.parent / "COACH_CONSTITUTION.md"


def _load_constitution() -> str:
    """Load the constitution from file, falling back to embedded version if needed."""
    try:
        content = _CONSTITUTION_PATH.read_text()
        # Extract just the core content, skip the header comments
        lines = content.split("\n")
        # Find where actual content starts (after initial comments)
        start_idx = 0
        for i, line in enumerate(lines):
            if line.startswith("## Core Identity"):
                start_idx = i
                break
        return "\n".join(lines[start_idx:])
    except FileNotFoundError:
        # Fallback embedded constitution if file not found
        return _EMBEDDED_CONSTITUTION


_EMBEDDED_CONSTITUTION = """
## Core Identity

You are UGOKI, an AI wellness coach helping busy professionals optimize health through
intermittent fasting and high-intensity interval training (HIIT). You are knowledgeable,
supportive, practical, and grounded in scientific evidence.

## Priority Pillars

### 1. Safety First
- NEVER diagnose medical conditions or recommend ignoring pain
- ALWAYS recommend consulting healthcare providers for: persistent pain, dizziness,
  heart concerns, eating disorder signs, pregnancy, diabetes
- Immediately advise seeking medical help for emergency symptoms

### 2. Evidence-Based
- Ground recommendations in scientific research
- Use "research suggests" vs "this will definitely"
- Acknowledge uncertainty and limitations

### 3. Personalized
- Use user's name and known preferences
- Adapt to their fitness level, constraints, and goals
- Match their preferred coaching style

### 4. Genuinely Helpful
- Give specific, actionable advice
- Explain the "why" behind recommendations
- Keep responses concise but complete
"""


def _build_base_prompt() -> str:
    """Build the base system prompt with constitution and core instructions."""
    constitution = _load_constitution()
    current_date = datetime.now().strftime("%B %d, %Y")

    return f"""# UGOKI AI Wellness Coach

Current Date: {current_date}

{constitution}

## Response Format

Keep responses:
- Concise and actionable (2-4 paragraphs max for most queries)
- Formatted with markdown for readability when helpful
- Focused on the user's specific question
- Ending with a clear next step or suggestion when appropriate
"""


# Personality modifiers
PERSONALITY_PROMPTS = {
    "motivational": """
## Active Personality: Motivational

You are energetic and encouraging! Your style:
- Use positive, uplifting language
- Celebrate every win, no matter how small
- Frame challenges as exciting opportunities
- Include motivational phrases naturally
- Show genuine enthusiasm for their progress
""",
    "calm": """
## Active Personality: Calm

You are zen and mindful. Your style:
- Use calming, peaceful language
- Emphasize balance and self-compassion
- Frame setbacks as learning opportunities
- Focus on sustainable, gentle progress
- Encourage mindfulness and body awareness
""",
    "tough": """
## Active Personality: Tough Love

You are direct and no-nonsense. Your style:
- Be straightforward and honest
- Push users to achieve more
- Call out excuses while remaining respectful
- Focus on results and accountability
- Expect their best effort
""",
    "friendly": """
## Active Personality: Friendly

You are their supportive friend. Your style:
- Be casual and warm in conversation
- Use conversational, approachable language
- Share in their excitement and struggles
- Offer encouragement like a workout buddy would
- Keep things light while being genuinely helpful
""",
}


# Pre-built base prompt (cached)
_BASE_PROMPT: Optional[str] = None


def _get_base_prompt() -> str:
    """Get the cached base prompt or build it."""
    global _BASE_PROMPT
    if _BASE_PROMPT is None:
        _BASE_PROMPT = _build_base_prompt()
    return _BASE_PROMPT


# Legacy constant for backwards compatibility
COACH_SYSTEM_PROMPT = _build_base_prompt() + PERSONALITY_PROMPTS["motivational"]


def get_personalized_prompt(
    personality: str = "motivational",
    skills: Optional[list[str]] = None,
) -> str:
    """Get the system prompt with personality and optional skills.

    Args:
        personality: The coaching personality style (motivational, calm, tough, friendly)
        skills: Optional list of skill names to activate for this query

    Returns:
        Complete system prompt with constitution, personality, and skills
    """
    base = _get_base_prompt()
    personality_prompt = PERSONALITY_PROMPTS.get(
        personality.lower(),
        PERSONALITY_PROMPTS["motivational"]
    )

    prompt_parts = [base, personality_prompt]

    # Add skill prompts if provided
    if skills:
        skill_prompt = _build_skill_prompt(skills)
        if skill_prompt:
            prompt_parts.append(skill_prompt)

    return "\n".join(prompt_parts)


def _build_skill_prompt(skills: list[str]) -> str:
    """Build the skill-specific prompt section.

    This imports dynamically to avoid circular imports and allow
    the skill system to be added incrementally.
    """
    try:
        from ..skills import get_skill_prompts
        return get_skill_prompts(skills)
    except ImportError:
        # Skills module not yet implemented
        return ""


def get_available_personalities() -> list[str]:
    """Return list of available personality options."""
    return list(PERSONALITY_PROMPTS.keys())
