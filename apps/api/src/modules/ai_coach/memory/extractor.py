"""Memory extraction using LLM.

Analyzes conversations to extract factual information about the user
that should be remembered across sessions.
"""

import json
import logging
from datetime import datetime, UTC
from typing import Optional

from .models import ExtractedMemory, MemoryType, MemoryCategory, MemoryExtractionResult

logger = logging.getLogger(__name__)

# Extraction prompt for Claude Haiku
EXTRACTION_PROMPT = """You are analyzing a wellness coaching conversation to extract key facts about the user that should be remembered for future personalization.

Extract ONLY clearly stated information - do not infer or assume anything not explicitly mentioned.

Categories to extract:

**FACT** - Explicit statements about the user:
- Injuries or physical limitations ("I have a bad knee", "I had back surgery")
- Medical conditions mentioned ("I have diabetes", "I take blood pressure medication")
- Work/life situation ("I work night shifts", "I have two kids")

**PREFERENCE** - Stated likes/dislikes:
- Workout preferences ("I prefer morning workouts", "I hate running")
- Food preferences ("I'm vegetarian", "I don't like eggs")
- Coaching style ("I like tough love", "Be gentle with me")

**GOAL** - Explicit objectives:
- Weight goals ("I want to lose 10 lbs", "Trying to get to 180")
- Fitness goals ("I want to do a pull-up", "Training for a 5K")
- Health goals ("I want to lower my cholesterol")

**CONSTRAINT** - Stated limitations:
- Time constraints ("I only have 20 minutes", "Can only workout 3x/week")
- Equipment limitations ("I only have dumbbells", "No gym access")
- Physical constraints ("Can't do jumping", "Low impact only")

For each extraction, assign a category from:
injury, medical, physical_limitation, schedule, availability, equipment, location,
fitness_level, experience, workout_preference, food_preference, coaching_style,
weight_goal, fitness_goal, health_goal, work, sleep, stress, general

Return a JSON array of objects with fields:
- memory_type: "fact", "preference", "goal", or "constraint"
- category: one of the categories listed above
- content: the extracted information (concise, 1-2 sentences max)
- confidence: 0.0-1.0 (how confident you are this is accurate)

Only extract if confidence >= 0.7. Return empty array [] if nothing to extract.

Example output:
[
  {"memory_type": "fact", "category": "injury", "content": "Has a chronic knee injury that limits squats", "confidence": 0.9},
  {"memory_type": "constraint", "category": "schedule", "content": "Can only workout in mornings before 7am", "confidence": 0.85}
]

Conversation to analyze:
"""


async def extract_memories_from_conversation(
    messages: list[dict],
    session_id: str,
    min_confidence: float = 0.7,
) -> MemoryExtractionResult:
    """
    Extract memories from a conversation using Claude Haiku.

    Args:
        messages: List of message dicts with 'role' and 'content'
        session_id: The conversation session ID
        min_confidence: Minimum confidence threshold for extraction

    Returns:
        MemoryExtractionResult with extracted memories
    """
    if not messages:
        return MemoryExtractionResult(
            memories=[],
            session_id=session_id,
            extracted_at=datetime.now(UTC),
        )

    # Build conversation text
    conv_text = "\n".join([
        f"{'User' if m.get('role') == 'user' else 'Coach'}: {m.get('content', '')[:300]}"
        for m in messages[-20:]  # Last 20 messages
    ])

    try:
        import anthropic

        client = anthropic.AsyncAnthropic()

        response = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"{EXTRACTION_PROMPT}\n{conv_text}"
                }
            ]
        )

        # Parse JSON response
        response_text = response.content[0].text if response.content else "[]"

        # Handle markdown code blocks if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        extracted_data = json.loads(response_text.strip())

        memories = []
        for item in extracted_data:
            try:
                # Validate and filter by confidence
                confidence = float(item.get("confidence", 0))
                if confidence < min_confidence:
                    continue

                # Parse memory type
                memory_type = MemoryType(item.get("memory_type", "fact"))

                # Parse category with fallback
                category_str = item.get("category", "general")
                try:
                    category = MemoryCategory(category_str)
                except ValueError:
                    category = MemoryCategory.GENERAL

                memories.append(ExtractedMemory(
                    memory_type=memory_type,
                    category=category,
                    content=item.get("content", "")[:500],
                    confidence=confidence,
                ))
            except (ValueError, KeyError) as e:
                logger.debug(f"Skipping invalid memory item: {e}")
                continue

        logger.info(f"Extracted {len(memories)} memories from conversation {session_id}")

        return MemoryExtractionResult(
            memories=memories,
            session_id=session_id,
            extracted_at=datetime.now(UTC),
        )

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse memory extraction response: {e}")
        return MemoryExtractionResult(
            memories=[],
            session_id=session_id,
            extracted_at=datetime.now(UTC),
        )
    except Exception as e:
        logger.error(f"Error extracting memories: {e}")
        return MemoryExtractionResult(
            memories=[],
            session_id=session_id,
            extracted_at=datetime.now(UTC),
        )


def should_extract_memories(message_count: int, last_extraction_count: Optional[int] = None) -> bool:
    """
    Determine if we should run memory extraction for this conversation.

    Extraction triggers:
    - After first 5 messages (initial context gathering)
    - Every 10 messages thereafter

    Args:
        message_count: Current message count in conversation
        last_extraction_count: Message count at last extraction (if any)

    Returns:
        True if extraction should run
    """
    if message_count < 5:
        return False

    if last_extraction_count is None:
        # First extraction after 5 messages
        return message_count >= 5

    # Extract every 10 messages
    return message_count - last_extraction_count >= 10
