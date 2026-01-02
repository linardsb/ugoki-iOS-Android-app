"""Base class for research data sources."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date

from src.modules.research.models import ResearchSource


@dataclass
class RawPaper:
    """Raw paper data from an external source (before AI processing)."""
    source_id: str  # ID from the source (e.g., PMID for PubMed)
    title: str
    authors: list[str]
    journal: str | None
    publication_date: date | None
    abstract: str | None
    external_url: str
    open_access: bool
    source: ResearchSource
    doi: str | None = None


class ResearchSourceAdapter(ABC):
    """
    Abstract base class for research data sources.

    Each adapter handles communication with a specific external API
    (PubMed, OpenAlex, Europe PMC, etc.) and normalizes the results
    into RawPaper objects.
    """

    @property
    @abstractmethod
    def source_name(self) -> ResearchSource:
        """The source this adapter handles."""
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        limit: int = 10,
    ) -> list[RawPaper]:
        """
        Search for papers matching the query.

        Args:
            query: Search query string
            limit: Maximum number of results

        Returns:
            List of RawPaper objects
        """
        pass

    @abstractmethod
    async def get_paper(
        self,
        source_id: str,
    ) -> RawPaper | None:
        """
        Get a specific paper by its source ID.

        Args:
            source_id: The ID in the source system (e.g., PMID)

        Returns:
            RawPaper or None if not found
        """
        pass
