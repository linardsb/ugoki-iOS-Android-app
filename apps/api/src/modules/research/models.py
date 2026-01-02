"""Pydantic models for RESEARCH module."""

from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, Field


class ResearchTopic(str, Enum):
    """Predefined research topics relevant to UGOKI."""
    INTERMITTENT_FASTING = "intermittent_fasting"
    HIIT = "hiit"
    NUTRITION = "nutrition"
    SLEEP = "sleep"


class ResearchSource(str, Enum):
    """Sources for research papers."""
    PUBMED = "pubmed"
    OPENALEX = "openalex"
    EUROPEPMC = "europepmc"


# =============================================================================
# AI-Generated Content Models
# =============================================================================

class KeyBenefit(BaseModel):
    """A single bite-sized benefit point from a research paper."""
    emoji: str = Field(..., description="Emoji representing the benefit")
    title: str = Field(..., max_length=50, description="Short benefit title")
    description: str = Field(..., max_length=200, description="1-2 sentence explanation")


class ResearchDigest(BaseModel):
    """AI-processed summary of a research paper - bite-sized and actionable."""
    one_liner: str = Field(..., description="Single sentence summary of the key finding")
    key_benefits: list[KeyBenefit] = Field(default_factory=list, description="3-5 main benefit points")
    who_benefits: str = Field(..., description="Who would benefit most from this research")
    tldr: str = Field(..., description="2-3 sentence plain English summary")


# =============================================================================
# Research Paper Models
# =============================================================================

class ResearchPaper(BaseModel):
    """A research paper with metadata and AI digest."""
    id: str = Field(..., description="Internal unique identifier")
    pmid: str | None = Field(None, description="PubMed ID")
    doi: str | None = Field(None, description="Digital Object Identifier")
    title: str
    authors: list[str] = Field(default_factory=list)
    journal: str | None = None
    publication_date: date | None = None
    topic: ResearchTopic

    # AI-generated digest (may be None if not yet processed)
    digest: ResearchDigest | None = None

    # Original abstract
    abstract: str | None = None

    # External link
    external_url: str = Field(..., description="Link to full paper")
    open_access: bool = False
    source: ResearchSource = ResearchSource.PUBMED

    # Metadata
    created_at: datetime
    updated_at: datetime


class ResearchPaperSummary(BaseModel):
    """Simplified paper for list views."""
    id: str
    title: str
    one_liner: str | None = None
    topic: ResearchTopic
    publication_date: date | None = None
    key_benefits_count: int = 0
    external_url: str
    is_saved: bool = False


# =============================================================================
# Request/Response Models
# =============================================================================

class SearchRequest(BaseModel):
    """Request to search for research papers."""
    query: str | None = Field(None, min_length=2, max_length=200, description="Search query")
    topic: ResearchTopic | None = Field(None, description="Filter by topic")
    limit: int = Field(10, ge=1, le=20, description="Max results to return")


class SearchResponse(BaseModel):
    """Response from a research search."""
    results: list[ResearchPaper]
    total_count: int
    searches_remaining: int = Field(..., description="User's remaining searches today")
    cached: bool = Field(False, description="Whether results came from cache")


class TopicResponse(BaseModel):
    """Response for topic-based research listing."""
    topic: ResearchTopic
    topic_label: str
    topic_description: str
    papers: list[ResearchPaper]
    total_count: int


# =============================================================================
# User Quota & Saved Research
# =============================================================================

class UserSearchQuota(BaseModel):
    """User's daily search quota status."""
    identity_id: str
    searches_today: int = 0
    limit: int = 15
    searches_remaining: int = 15
    resets_at: datetime


class SaveResearchRequest(BaseModel):
    """Request to save a research paper."""
    research_id: str
    notes: str | None = Field(None, max_length=500, description="User's personal notes")


class SavedResearch(BaseModel):
    """A user's saved research paper."""
    id: str
    identity_id: str
    research_id: str
    paper: ResearchPaper | None = None
    notes: str | None = None
    saved_at: datetime


# =============================================================================
# Topic Metadata
# =============================================================================

TOPIC_METADATA: dict[ResearchTopic, dict[str, str]] = {
    ResearchTopic.INTERMITTENT_FASTING: {
        "label": "Intermittent Fasting",
        "description": "Research on time-restricted eating, fasting protocols, and metabolic benefits",
        "icon": "fork-knife",
        "color": "#14b8a6",  # teal
        "search_terms": "intermittent fasting OR time-restricted eating OR 16:8 fasting OR alternate day fasting",
    },
    ResearchTopic.HIIT: {
        "label": "HIIT Training",
        "description": "High-intensity interval training research, workout optimization, and fitness gains",
        "icon": "lightning",
        "color": "#f97316",  # orange
        "search_terms": "high intensity interval training OR HIIT OR sprint interval training OR tabata",
    },
    ResearchTopic.NUTRITION: {
        "label": "Nutrition",
        "description": "Diet, macronutrients, supplements, and their effects on health and performance",
        "icon": "carrot",
        "color": "#22c55e",  # green
        "search_terms": "nutrition AND (exercise OR fitness OR health) AND (protein OR diet OR macronutrients)",
    },
    ResearchTopic.SLEEP: {
        "label": "Sleep",
        "description": "Sleep quality, recovery, circadian rhythm, and their impact on fitness",
        "icon": "moon",
        "color": "#8b5cf6",  # purple
        "search_terms": "sleep AND (exercise OR recovery OR performance OR health)",
    },
}
