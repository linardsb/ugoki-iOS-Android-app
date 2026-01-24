"""Query classifier for context selection."""

import logging

from .models import QueryType

logger = logging.getLogger(__name__)

# Keywords for each query type
QUERY_TYPE_KEYWORDS = {
    QueryType.WORKOUT: [
        "workout", "exercise", "hiit", "training", "reps", "sets", "form",
        "routine", "strength", "cardio", "stretch", "burpee", "squat",
        "lunge", "plank", "pushup", "muscle", "sweat", "gym",
    ],
    QueryType.FASTING: [
        "fast", "fasting", "intermittent", "16:8", "eating window",
        "break fast", "hungry", "hunger", "autophagy", "ketosis",
        "meal timing", "when to eat",
    ],
    QueryType.PROGRESS: [
        "progress", "stats", "level", "xp", "streak", "weight",
        "lost", "gained", "improvement", "trend", "history",
        "how am i doing", "how's my", "results",
    ],
    QueryType.NUTRITION: [
        "food", "eat", "meal", "diet", "protein", "carb", "calorie",
        "recipe", "nutrition", "drink", "hydration", "supplement",
    ],
    QueryType.MOTIVATION: [
        "motivation", "motivate", "struggle", "hard", "can't", "quit",
        "give up", "tired", "lazy", "help me", "frustrated", "stuck",
        "setback", "discouraged",
    ],
}


def classify_query(query: str) -> list[QueryType]:
    """
    Classify a query to determine which context types are relevant.

    Args:
        query: The user's query

    Returns:
        List of QueryType values, ordered by relevance
    """
    query_lower = query.lower()
    scores: dict[QueryType, int] = {}

    for query_type, keywords in QUERY_TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        if score > 0:
            scores[query_type] = score

    # Sort by score, return top matches
    if not scores:
        return [QueryType.GENERAL]

    sorted_types = sorted(scores.keys(), key=lambda t: scores[t], reverse=True)

    # Return top 2 types maximum
    result = sorted_types[:2]

    logger.debug(f"Query classified as: {[t.value for t in result]}")
    return result


def get_query_type_keywords(query_type: QueryType) -> list[str]:
    """Get keywords associated with a query type."""
    return QUERY_TYPE_KEYWORDS.get(query_type, [])
