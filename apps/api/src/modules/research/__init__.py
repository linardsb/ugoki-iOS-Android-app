"""
RESEARCH module - Scientific research aggregation and AI summarization.

This module provides:
- Search across scientific research databases (PubMed, OpenAlex, Europe PMC)
- AI-powered bite-sized summaries of research papers
- User saved research collections
- Rate limiting (15 searches/day per user)
- Aggressive caching for cost optimization

Black Box Interface:
- Consumers interact only through ResearchInterface
- All IDs are opaque strings
- Implementation details (APIs, caching, AI) are hidden
"""

from src.modules.research.interface import ResearchInterface
from src.modules.research.service import ResearchService
from src.modules.research.models import (
    ResearchTopic,
    KeyBenefit,
    ResearchDigest,
    ResearchPaper,
    SearchRequest,
    SearchResponse,
    UserSearchQuota,
    SavedResearch,
)

__all__ = [
    "ResearchInterface",
    "ResearchService",
    "ResearchTopic",
    "KeyBenefit",
    "ResearchDigest",
    "ResearchPaper",
    "SearchRequest",
    "SearchResponse",
    "UserSearchQuota",
    "SavedResearch",
]
