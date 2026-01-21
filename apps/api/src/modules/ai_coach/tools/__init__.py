"""Tools for AI Coach agent."""

from src.modules.ai_coach.tools.fitness_tools import FitnessTools
from src.modules.ai_coach.tools.web_search import perform_web_search
from src.modules.ai_coach.tools.documents import (
    retrieve_documents,
    list_available_documents,
    get_document_by_id,
)

__all__ = [
    "FitnessTools",
    "perform_web_search",
    "retrieve_documents",
    "list_available_documents",
    "get_document_by_id",
]
