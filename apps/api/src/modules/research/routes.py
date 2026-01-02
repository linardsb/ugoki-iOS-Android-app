"""FastAPI routes for RESEARCH module."""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.research.models import (
    ResearchTopic,
    ResearchPaper,
    SearchResponse,
    TopicResponse,
    UserSearchQuota,
    SavedResearch,
    SaveResearchRequest,
)
from src.modules.research.service import ResearchService


router = APIRouter(tags=["research"])


def get_research_service(db: AsyncSession = Depends(get_db)) -> ResearchService:
    """Get research service instance."""
    return ResearchService(db)


# =============================================================================
# Search & Discovery
# =============================================================================

@router.get("/search", response_model=SearchResponse)
async def search_research(
    identity_id: str,  # TODO: Extract from JWT
    query: str | None = Query(None, min_length=2, max_length=200, description="Search query"),
    topic: ResearchTopic | None = Query(None, description="Filter by topic"),
    limit: int = Query(10, ge=1, le=20, description="Max results"),
    service: ResearchService = Depends(get_research_service),
) -> SearchResponse:
    """
    Search for research papers.

    Counts against user's daily quota (15/day).
    Results include AI-generated bite-sized summaries.

    - **query**: Free-text search (e.g., "benefits of fasting")
    - **topic**: Filter by predefined topic
    - **limit**: Max results to return (1-20)
    """
    return await service.search(
        identity_id=identity_id,
        query=query,
        topic=topic,
        limit=limit,
    )


@router.get("/topics", response_model=list[dict])
async def get_topics(
    service: ResearchService = Depends(get_research_service),
) -> list[dict]:
    """
    Get all available research topics with metadata.

    Returns topic IDs, labels, descriptions, icons, and colors.
    """
    return await service.get_topics()


@router.get("/topics/{topic}", response_model=TopicResponse)
async def get_topic_papers(
    topic: ResearchTopic,
    limit: int = Query(10, ge=1, le=20, description="Max results"),
    service: ResearchService = Depends(get_research_service),
) -> TopicResponse:
    """
    Get pre-curated papers for a specific topic.

    Does NOT count against user's daily quota.
    Results are cached and refreshed daily.
    """
    return await service.get_topic_papers(topic=topic, limit=limit)


@router.get("/papers/{paper_id}", response_model=ResearchPaper)
async def get_paper(
    paper_id: str,
    service: ResearchService = Depends(get_research_service),
) -> ResearchPaper:
    """
    Get a single research paper by ID.

    Does NOT count against quota.
    """
    paper = await service.get_paper(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )
    return paper


# =============================================================================
# User Saved Research
# =============================================================================

@router.get("/saved", response_model=list[SavedResearch])
async def get_saved_research(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ResearchService = Depends(get_research_service),
) -> list[SavedResearch]:
    """
    Get user's saved research papers.
    """
    return await service.get_saved_papers(
        identity_id=identity_id,
        limit=limit,
        offset=offset,
    )


@router.post("/saved", response_model=SavedResearch, status_code=status.HTTP_201_CREATED)
async def save_research(
    request: SaveResearchRequest,
    identity_id: str,  # TODO: Extract from JWT
    service: ResearchService = Depends(get_research_service),
) -> SavedResearch:
    """
    Save a research paper to user's collection.
    """
    try:
        return await service.save_paper(
            identity_id=identity_id,
            research_id=request.research_id,
            notes=request.notes,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/saved/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_research(
    saved_id: str,
    identity_id: str,  # TODO: Extract from JWT
    service: ResearchService = Depends(get_research_service),
) -> None:
    """
    Remove a research paper from user's saved collection.
    """
    success = await service.unsave_paper(
        identity_id=identity_id,
        saved_id=saved_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved research not found",
        )


# =============================================================================
# Quota
# =============================================================================

@router.get("/quota", response_model=UserSearchQuota)
async def get_quota(
    identity_id: str,  # TODO: Extract from JWT
    service: ResearchService = Depends(get_research_service),
) -> UserSearchQuota:
    """
    Get user's current search quota status.

    Shows remaining searches for today and reset time.
    """
    return await service.get_quota(identity_id)
