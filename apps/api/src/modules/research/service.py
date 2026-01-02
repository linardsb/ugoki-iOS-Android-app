"""
Service implementation for RESEARCH module.

This service:
- Searches external research APIs (PubMed)
- Generates AI-powered summaries
- Manages caching for cost optimization
- Enforces rate limits (15 searches/day per user)
- Manages user saved papers
"""

import uuid
from datetime import datetime, UTC, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.modules.research.interface import ResearchInterface
from src.modules.research.models import (
    ResearchTopic,
    ResearchSource,
    ResearchPaper,
    ResearchDigest,
    KeyBenefit,
    SearchResponse,
    TopicResponse,
    UserSearchQuota,
    SavedResearch,
    TOPIC_METADATA,
)
from src.modules.research.orm import (
    ResearchPaperORM,
    UserSavedResearchORM,
    UserSearchQuotaORM,
)
from src.modules.research.sources.pubmed import PubMedSource
from src.modules.research.sources.base import RawPaper
from src.modules.research.ai.summarizer import ResearchSummarizer, MockSummarizer


# Daily search limit per user
DAILY_SEARCH_LIMIT = 15

# Cache duration for topic papers (hours)
TOPIC_CACHE_HOURS = 24


def _ensure_tz(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class ResearchService(ResearchInterface):
    """Implementation of RESEARCH interface."""

    def __init__(
        self,
        db: AsyncSession,
        pubmed_email: str = "ugoki@example.com",
        pubmed_api_key: str | None = None,
    ):
        self._db = db
        self._pubmed = PubMedSource(email=pubmed_email, api_key=pubmed_api_key)

        # Initialize AI summarizer based on config
        if settings.anthropic_api_key:
            self._summarizer = ResearchSummarizer(api_key=settings.anthropic_api_key)
        else:
            # Use mock summarizer when no API key available
            self._summarizer = MockSummarizer()

    # =========================================================================
    # ORM to Model Conversions
    # =========================================================================

    def _paper_orm_to_model(
        self,
        orm: ResearchPaperORM,
        is_saved: bool = False,
    ) -> ResearchPaper:
        """Convert ORM to Pydantic model."""
        # Build digest if AI data exists
        digest = None
        if orm.one_liner:
            key_benefits = []
            if orm.key_benefits:
                for kb in orm.key_benefits:
                    key_benefits.append(KeyBenefit(
                        emoji=kb.get("emoji", "✨"),
                        title=kb.get("title", ""),
                        description=kb.get("description", ""),
                    ))

            digest = ResearchDigest(
                one_liner=orm.one_liner,
                key_benefits=key_benefits,
                who_benefits=orm.who_benefits or "",
                tldr=orm.tldr or "",
            )

        return ResearchPaper(
            id=orm.id,
            pmid=orm.pmid,
            doi=orm.doi,
            title=orm.title,
            authors=orm.authors or [],
            journal=orm.journal,
            publication_date=orm.publication_date,
            topic=orm.topic,
            digest=digest,
            abstract=orm.abstract,
            external_url=orm.external_url,
            open_access=orm.open_access,
            source=orm.source,
            created_at=_ensure_tz(orm.created_at),
            updated_at=_ensure_tz(orm.updated_at),
        )

    def _saved_orm_to_model(
        self,
        orm: UserSavedResearchORM,
    ) -> SavedResearch:
        """Convert saved research ORM to model."""
        paper = None
        if orm.paper:
            paper = self._paper_orm_to_model(orm.paper, is_saved=True)

        return SavedResearch(
            id=orm.id,
            identity_id=orm.identity_id,
            research_id=orm.research_id,
            paper=paper,
            notes=orm.notes,
            saved_at=_ensure_tz(orm.saved_at),
        )

    async def _raw_to_orm(
        self,
        raw: RawPaper,
        topic: ResearchTopic,
    ) -> ResearchPaperORM:
        """Convert raw paper to ORM and cache in database."""
        # Check if already cached by PMID
        if raw.source_id:
            existing = await self._db.execute(
                select(ResearchPaperORM).where(ResearchPaperORM.pmid == raw.source_id)
            )
            existing_paper = existing.scalar_one_or_none()
            if existing_paper:
                return existing_paper

        # Create new ORM
        orm = ResearchPaperORM(
            id=str(uuid.uuid4()),
            pmid=raw.source_id if raw.source == ResearchSource.PUBMED else None,
            doi=raw.doi,
            title=raw.title,
            authors=raw.authors,
            journal=raw.journal,
            publication_date=raw.publication_date,
            topic=topic,
            abstract=raw.abstract,
            external_url=raw.external_url,
            open_access=raw.open_access,
            source=raw.source,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        self._db.add(orm)
        await self._db.flush()

        return orm

    async def _ensure_digest(self, orm: ResearchPaperORM) -> None:
        """Generate AI digest if not already present."""
        if orm.one_liner:
            # Already has digest
            return

        if not orm.abstract:
            # Can't summarize without abstract
            return

        topic_meta = TOPIC_METADATA.get(orm.topic, {})
        topic_context = topic_meta.get("label", "")

        digest = await self._summarizer.summarize(
            title=orm.title,
            abstract=orm.abstract,
            topic_context=topic_context,
        )

        if digest:
            orm.one_liner = digest.one_liner
            orm.key_benefits = [
                {"emoji": kb.emoji, "title": kb.title, "description": kb.description}
                for kb in digest.key_benefits
            ]
            orm.who_benefits = digest.who_benefits
            orm.tldr = digest.tldr
            orm.ai_processed_at = datetime.now(UTC)
            orm.updated_at = datetime.now(UTC)

    # =========================================================================
    # Search & Discovery
    # =========================================================================

    async def search(
        self,
        identity_id: str,
        query: str | None = None,
        topic: ResearchTopic | None = None,
        limit: int = 10,
    ) -> SearchResponse:
        """Search for research papers."""
        # Check and increment quota
        can_search, remaining = await self.check_and_increment_quota(identity_id)
        if not can_search:
            return SearchResponse(
                results=[],
                total_count=0,
                searches_remaining=0,
                cached=False,
            )

        # Build search query
        search_query = query or ""
        if topic:
            topic_meta = TOPIC_METADATA.get(topic, {})
            topic_terms = topic_meta.get("search_terms", "")
            if search_query:
                search_query = f"({search_query}) AND ({topic_terms})"
            else:
                search_query = topic_terms

        if not search_query:
            return SearchResponse(
                results=[],
                total_count=0,
                searches_remaining=remaining,
                cached=False,
            )

        # Search PubMed
        raw_papers = await self._pubmed.search(search_query, limit=limit)

        # Convert and cache papers
        papers = []
        inferred_topic = topic or ResearchTopic.NUTRITION  # Default topic

        for raw in raw_papers:
            orm = await self._raw_to_orm(raw, inferred_topic)
            await self._ensure_digest(orm)
            papers.append(self._paper_orm_to_model(orm))

        await self._db.commit()

        return SearchResponse(
            results=papers,
            total_count=len(papers),
            searches_remaining=remaining,
            cached=False,
        )

    async def get_topic_papers(
        self,
        topic: ResearchTopic,
        limit: int = 10,
    ) -> TopicResponse:
        """Get pre-curated papers for a topic (doesn't count against quota)."""
        topic_meta = TOPIC_METADATA.get(topic, {})

        # Check cache first
        cache_cutoff = datetime.now(UTC) - timedelta(hours=TOPIC_CACHE_HOURS)
        cached_query = await self._db.execute(
            select(ResearchPaperORM)
            .where(
                and_(
                    ResearchPaperORM.topic == topic,
                    ResearchPaperORM.created_at > cache_cutoff,
                    ResearchPaperORM.one_liner.isnot(None),
                )
            )
            .order_by(ResearchPaperORM.publication_date.desc())
            .limit(limit)
        )
        cached_papers = cached_query.scalars().all()

        if len(cached_papers) >= limit:
            papers = [self._paper_orm_to_model(p) for p in cached_papers]
            return TopicResponse(
                topic=topic,
                topic_label=topic_meta.get("label", topic.value),
                topic_description=topic_meta.get("description", ""),
                papers=papers,
                total_count=len(papers),
            )

        # Fetch fresh papers
        search_terms = topic_meta.get("search_terms", topic.value)
        raw_papers = await self._pubmed.search(search_terms, limit=limit)

        papers = []
        for raw in raw_papers:
            orm = await self._raw_to_orm(raw, topic)
            await self._ensure_digest(orm)
            papers.append(self._paper_orm_to_model(orm))

        await self._db.commit()

        return TopicResponse(
            topic=topic,
            topic_label=topic_meta.get("label", topic.value),
            topic_description=topic_meta.get("description", ""),
            papers=papers,
            total_count=len(papers),
        )

    async def get_paper(self, paper_id: str) -> ResearchPaper | None:
        """Get a single paper by ID."""
        result = await self._db.execute(
            select(ResearchPaperORM).where(ResearchPaperORM.id == paper_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            return None

        return self._paper_orm_to_model(orm)

    # =========================================================================
    # User Saved Research
    # =========================================================================

    async def save_paper(
        self,
        identity_id: str,
        research_id: str,
        notes: str | None = None,
    ) -> SavedResearch:
        """Save a paper to user's collection."""
        # Check if already saved
        existing = await self._db.execute(
            select(UserSavedResearchORM).where(
                and_(
                    UserSavedResearchORM.identity_id == identity_id,
                    UserSavedResearchORM.research_id == research_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Paper already saved")

        # Verify paper exists
        paper = await self._db.execute(
            select(ResearchPaperORM).where(ResearchPaperORM.id == research_id)
        )
        if not paper.scalar_one_or_none():
            raise ValueError("Paper not found")

        saved = UserSavedResearchORM(
            id=str(uuid.uuid4()),
            identity_id=identity_id,
            research_id=research_id,
            notes=notes,
            saved_at=datetime.now(UTC),
        )

        self._db.add(saved)
        await self._db.commit()

        # Reload with paper relationship
        result = await self._db.execute(
            select(UserSavedResearchORM)
            .options(selectinload(UserSavedResearchORM.paper))
            .where(UserSavedResearchORM.id == saved.id)
        )
        saved = result.scalar_one()

        return self._saved_orm_to_model(saved)

    async def unsave_paper(
        self,
        identity_id: str,
        saved_id: str,
    ) -> bool:
        """Remove a paper from user's saved collection."""
        result = await self._db.execute(
            delete(UserSavedResearchORM).where(
                and_(
                    UserSavedResearchORM.id == saved_id,
                    UserSavedResearchORM.identity_id == identity_id,
                )
            )
        )
        await self._db.commit()
        return result.rowcount > 0

    async def get_saved_papers(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[SavedResearch]:
        """Get user's saved research papers."""
        result = await self._db.execute(
            select(UserSavedResearchORM)
            .options(selectinload(UserSavedResearchORM.paper))
            .where(UserSavedResearchORM.identity_id == identity_id)
            .order_by(UserSavedResearchORM.saved_at.desc())
            .limit(limit)
            .offset(offset)
        )
        saved_list = result.scalars().all()

        return [self._saved_orm_to_model(s) for s in saved_list]

    # =========================================================================
    # Quota Management
    # =========================================================================

    async def get_quota(self, identity_id: str) -> UserSearchQuota:
        """Get user's current search quota status."""
        result = await self._db.execute(
            select(UserSearchQuotaORM).where(
                UserSearchQuotaORM.identity_id == identity_id
            )
        )
        quota = result.scalar_one_or_none()

        now = datetime.now(UTC)

        if not quota:
            # New user, full quota
            return UserSearchQuota(
                identity_id=identity_id,
                searches_today=0,
                limit=DAILY_SEARCH_LIMIT,
                searches_remaining=DAILY_SEARCH_LIMIT,
                resets_at=self._next_reset_time(now),
            )

        # Check if quota needs reset
        if now >= _ensure_tz(quota.quota_resets_at):
            return UserSearchQuota(
                identity_id=identity_id,
                searches_today=0,
                limit=DAILY_SEARCH_LIMIT,
                searches_remaining=DAILY_SEARCH_LIMIT,
                resets_at=self._next_reset_time(now),
            )

        remaining = max(0, DAILY_SEARCH_LIMIT - quota.searches_today)
        return UserSearchQuota(
            identity_id=identity_id,
            searches_today=quota.searches_today,
            limit=DAILY_SEARCH_LIMIT,
            searches_remaining=remaining,
            resets_at=_ensure_tz(quota.quota_resets_at),
        )

    async def check_and_increment_quota(
        self,
        identity_id: str,
    ) -> tuple[bool, int]:
        """Check if user can search and increment counter."""
        now = datetime.now(UTC)

        result = await self._db.execute(
            select(UserSearchQuotaORM).where(
                UserSearchQuotaORM.identity_id == identity_id
            )
        )
        quota = result.scalar_one_or_none()

        if not quota:
            # Create new quota record
            quota = UserSearchQuotaORM(
                identity_id=identity_id,
                searches_today=1,
                last_search_at=now,
                quota_resets_at=self._next_reset_time(now),
            )
            self._db.add(quota)
            await self._db.flush()
            return True, DAILY_SEARCH_LIMIT - 1

        # Check if quota needs reset
        if now >= _ensure_tz(quota.quota_resets_at):
            quota.searches_today = 1
            quota.last_search_at = now
            quota.quota_resets_at = self._next_reset_time(now)
            await self._db.flush()
            return True, DAILY_SEARCH_LIMIT - 1

        # Check if over limit
        if quota.searches_today >= DAILY_SEARCH_LIMIT:
            return False, 0

        # Increment
        quota.searches_today += 1
        quota.last_search_at = now
        await self._db.flush()

        remaining = DAILY_SEARCH_LIMIT - quota.searches_today
        return True, remaining

    def _next_reset_time(self, now: datetime) -> datetime:
        """Calculate next midnight UTC for quota reset."""
        tomorrow = now.date() + timedelta(days=1)
        return datetime(tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=UTC)

    # =========================================================================
    # Topics
    # =========================================================================

    async def get_topics(self) -> list[dict]:
        """Get all available research topics with metadata."""
        topics = []
        for topic, meta in TOPIC_METADATA.items():
            topics.append({
                "id": topic.value,
                "label": meta["label"],
                "description": meta["description"],
                "icon": meta["icon"],
                "color": meta["color"],
            })
        return topics
