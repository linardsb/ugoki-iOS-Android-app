"""
Abstract interface for RESEARCH module.

This interface defines the contract for the Research module.
All implementation details are hidden behind this interface.

Black Box Rules Applied:
- All IDs are opaque strings
- No database details exposed
- No external API details exposed
- Consumers cannot know about PubMed, caching, or AI summarization internals
"""

from abc import ABC, abstractmethod

from src.modules.research.models import (
    ResearchTopic,
    ResearchPaper,
    SearchResponse,
    TopicResponse,
    UserSearchQuota,
    SavedResearch,
)


class ResearchInterface(ABC):
    """
    RESEARCH module interface.

    Provides access to scientific research with AI-powered summaries.
    Hides: External API calls, caching, rate limiting, AI summarization.
    """

    # =========================================================================
    # Search & Discovery
    # =========================================================================

    @abstractmethod
    async def search(
        self,
        identity_id: str,
        query: str | None = None,
        topic: ResearchTopic | None = None,
        limit: int = 10,
    ) -> SearchResponse:
        """
        Search for research papers.

        Counts against user's daily quota (15/day).
        Returns AI-digested summaries when available.
        Results may be cached.

        Args:
            identity_id: User making the search (opaque reference)
            query: Free-text search query
            topic: Filter by predefined topic
            limit: Max results (1-20)

        Returns:
            SearchResponse with results and remaining quota
        """
        pass

    @abstractmethod
    async def get_topic_papers(
        self,
        topic: ResearchTopic,
        limit: int = 10,
    ) -> TopicResponse:
        """
        Get pre-curated papers for a topic.

        Does NOT count against user's quota.
        Results are cached daily.

        Args:
            topic: The research topic
            limit: Max results

        Returns:
            TopicResponse with curated papers
        """
        pass

    @abstractmethod
    async def get_paper(
        self,
        paper_id: str,
    ) -> ResearchPaper | None:
        """
        Get a single paper by ID.

        Does NOT count against quota.

        Args:
            paper_id: Opaque paper identifier

        Returns:
            ResearchPaper or None if not found
        """
        pass

    # =========================================================================
    # User Saved Research
    # =========================================================================

    @abstractmethod
    async def save_paper(
        self,
        identity_id: str,
        research_id: str,
        notes: str | None = None,
    ) -> SavedResearch:
        """
        Save a paper to user's collection.

        Args:
            identity_id: User saving the paper
            research_id: Paper to save
            notes: Optional personal notes

        Returns:
            SavedResearch record
        """
        pass

    @abstractmethod
    async def unsave_paper(
        self,
        identity_id: str,
        saved_id: str,
    ) -> bool:
        """
        Remove a paper from user's saved collection.

        Args:
            identity_id: User unsaving
            saved_id: SavedResearch record ID

        Returns:
            True if removed, False if not found
        """
        pass

    @abstractmethod
    async def get_saved_papers(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[SavedResearch]:
        """
        Get user's saved research papers.

        Args:
            identity_id: User
            limit: Max results
            offset: Pagination offset

        Returns:
            List of SavedResearch with paper details
        """
        pass

    # =========================================================================
    # Quota Management
    # =========================================================================

    @abstractmethod
    async def get_quota(
        self,
        identity_id: str,
    ) -> UserSearchQuota:
        """
        Get user's current search quota status.

        Args:
            identity_id: User

        Returns:
            UserSearchQuota with remaining searches
        """
        pass

    @abstractmethod
    async def check_and_increment_quota(
        self,
        identity_id: str,
    ) -> tuple[bool, int]:
        """
        Check if user can search and increment counter.

        Args:
            identity_id: User

        Returns:
            Tuple of (can_search, remaining_after)
        """
        pass

    # =========================================================================
    # Topics
    # =========================================================================

    @abstractmethod
    async def get_topics(self) -> list[dict]:
        """
        Get all available research topics with metadata.

        Returns:
            List of topic metadata dicts
        """
        pass
