"""PubMed data source adapter using NCBI E-utilities API."""

import asyncio
import xml.etree.ElementTree as ET
from datetime import date
from typing import Any

import httpx

from src.modules.research.models import ResearchSource
from src.modules.research.sources.base import ResearchSourceAdapter, RawPaper


class PubMedSource(ResearchSourceAdapter):
    """
    PubMed adapter using NCBI E-utilities API.

    API Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25497/

    Rate Limits:
    - Without API key: 3 requests/second
    - With API key: 10 requests/second

    The API is completely FREE.
    """

    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

    def __init__(
        self,
        email: str = "ugoki@example.com",
        api_key: str | None = None,
    ):
        """
        Initialize PubMed adapter.

        Args:
            email: Required by NCBI for contact purposes
            api_key: Optional API key for higher rate limits
        """
        self._email = email
        self._api_key = api_key
        self._client = httpx.AsyncClient(timeout=30.0)

    @property
    def source_name(self) -> ResearchSource:
        return ResearchSource.PUBMED

    def _base_params(self) -> dict[str, str]:
        """Get base parameters for all API calls."""
        params = {"email": self._email}
        if self._api_key:
            params["api_key"] = self._api_key
        return params

    async def search(
        self,
        query: str,
        limit: int = 10,
    ) -> list[RawPaper]:
        """
        Search PubMed for papers matching the query.

        Uses ESearch to find IDs, then EFetch to get details.
        """
        # Step 1: Search for IDs
        search_params = {
            **self._base_params(),
            "db": "pubmed",
            "term": query,
            "retmax": str(limit),
            "retmode": "json",
            "sort": "relevance",
        }

        try:
            response = await self._client.get(
                f"{self.BASE_URL}/esearch.fcgi",
                params=search_params,
            )
            response.raise_for_status()
            data = response.json()

            id_list = data.get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return []

            # Step 2: Fetch paper details
            return await self._fetch_papers(id_list)

        except Exception as e:
            print(f"PubMed search error: {e}")
            return []

    async def _fetch_papers(self, pmids: list[str]) -> list[RawPaper]:
        """Fetch full paper details for a list of PMIDs."""
        if not pmids:
            return []

        fetch_params = {
            **self._base_params(),
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
        }

        try:
            response = await self._client.get(
                f"{self.BASE_URL}/efetch.fcgi",
                params=fetch_params,
            )
            response.raise_for_status()

            return self._parse_xml_response(response.text)

        except Exception as e:
            print(f"PubMed fetch error: {e}")
            return []

    def _parse_xml_response(self, xml_text: str) -> list[RawPaper]:
        """Parse PubMed XML response into RawPaper objects."""
        papers = []

        try:
            root = ET.fromstring(xml_text)

            for article in root.findall(".//PubmedArticle"):
                paper = self._parse_article(article)
                if paper:
                    papers.append(paper)

        except ET.ParseError as e:
            print(f"XML parse error: {e}")

        return papers

    def _parse_article(self, article: ET.Element) -> RawPaper | None:
        """Parse a single PubmedArticle element."""
        try:
            medline = article.find("MedlineCitation")
            if medline is None:
                return None

            pmid_elem = medline.find("PMID")
            if pmid_elem is None or pmid_elem.text is None:
                return None
            pmid = pmid_elem.text

            article_data = medline.find("Article")
            if article_data is None:
                return None

            # Title
            title_elem = article_data.find("ArticleTitle")
            title = title_elem.text if title_elem is not None and title_elem.text else "Untitled"

            # Authors
            authors = []
            author_list = article_data.find("AuthorList")
            if author_list is not None:
                for author in author_list.findall("Author"):
                    last_name = author.find("LastName")
                    first_name = author.find("ForeName")
                    if last_name is not None and last_name.text:
                        name = last_name.text
                        if first_name is not None and first_name.text:
                            name = f"{first_name.text} {name}"
                        authors.append(name)

            # Journal
            journal = None
            journal_elem = article_data.find("Journal/Title")
            if journal_elem is not None:
                journal = journal_elem.text

            # Publication date
            pub_date = None
            pub_date_elem = article_data.find("Journal/JournalIssue/PubDate")
            if pub_date_elem is not None:
                year_elem = pub_date_elem.find("Year")
                month_elem = pub_date_elem.find("Month")
                day_elem = pub_date_elem.find("Day")

                if year_elem is not None and year_elem.text:
                    year = int(year_elem.text)
                    month = 1
                    day = 1

                    if month_elem is not None and month_elem.text:
                        try:
                            month = int(month_elem.text)
                        except ValueError:
                            # Month might be text like "Jan"
                            month_map = {
                                "jan": 1, "feb": 2, "mar": 3, "apr": 4,
                                "may": 5, "jun": 6, "jul": 7, "aug": 8,
                                "sep": 9, "oct": 10, "nov": 11, "dec": 12,
                            }
                            month = month_map.get(month_elem.text.lower()[:3], 1)

                    if day_elem is not None and day_elem.text:
                        try:
                            day = int(day_elem.text)
                        except ValueError:
                            day = 1

                    try:
                        pub_date = date(year, month, day)
                    except ValueError:
                        pub_date = date(year, 1, 1)

            # Abstract
            abstract = None
            abstract_elem = article_data.find("Abstract/AbstractText")
            if abstract_elem is not None:
                # Handle structured abstracts (multiple AbstractText elements)
                abstract_parts = []
                for abs_text in article_data.findall("Abstract/AbstractText"):
                    if abs_text.text:
                        label = abs_text.get("Label", "")
                        if label:
                            abstract_parts.append(f"{label}: {abs_text.text}")
                        else:
                            abstract_parts.append(abs_text.text)
                abstract = " ".join(abstract_parts)

            # DOI
            doi = None
            for article_id in article.findall(".//ArticleId"):
                if article_id.get("IdType") == "doi":
                    doi = article_id.text
                    break

            # Open access check (simplified - check for PMC ID)
            open_access = False
            for article_id in article.findall(".//ArticleId"):
                if article_id.get("IdType") == "pmc":
                    open_access = True
                    break

            return RawPaper(
                source_id=pmid,
                title=title,
                authors=authors[:5],  # Limit to first 5 authors
                journal=journal,
                publication_date=pub_date,
                abstract=abstract,
                external_url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                open_access=open_access,
                source=ResearchSource.PUBMED,
                doi=doi,
            )

        except Exception as e:
            print(f"Error parsing article: {e}")
            return None

    async def get_paper(self, source_id: str) -> RawPaper | None:
        """Get a single paper by PMID."""
        papers = await self._fetch_papers([source_id])
        return papers[0] if papers else None

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()
