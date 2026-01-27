"""Client initialization for UGOKI AI Coach."""

import os
import logging
from typing import Any

from openai import AsyncOpenAI
from httpx import AsyncClient

from src.core.config import settings

logger = logging.getLogger(__name__)


def get_embedding_client() -> AsyncOpenAI:
    """
    Get the OpenAI client for embeddings.

    Uses UGOKI config settings with fallback to environment variables.
    """
    api_key = (
        os.getenv("EMBEDDING_API_KEY")
        or settings.embedding_api_key
        or settings.openai_api_key
    )
    base_url = (
        os.getenv("EMBEDDING_BASE_URL")
        or settings.embedding_base_url
        or "https://api.openai.com/v1"
    )

    if not api_key:
        logger.warning("No embedding API key configured, embeddings will fail")
        api_key = "no-key-configured"

    return AsyncOpenAI(base_url=base_url, api_key=api_key)


def get_http_client() -> AsyncClient:
    """Get an async HTTP client for tool operations."""
    return AsyncClient(timeout=30.0)


def get_brave_api_key() -> str | None:
    """Get the Brave Search API key if configured."""
    return os.getenv("BRAVE_API_KEY") or settings.brave_api_key or None


def get_llm_config() -> dict[str, Any]:
    """
    Get LLM configuration based on UGOKI settings.

    Supports multiple providers: openai, ollama, groq, anthropic
    """
    # Check for explicit LLM provider override, otherwise use ai_provider
    provider = (
        os.getenv("LLM_PROVIDER")
        or settings.llm_provider
        or settings.ai_provider
    )

    if provider == "openai":
        return {
            "provider": "openai",
            "model": os.getenv("LLM_CHOICE") or settings.llm_choice or "gpt-4o-mini",
            "api_key": os.getenv("LLM_API_KEY") or settings.llm_api_key or settings.openai_api_key,
            "base_url": os.getenv("LLM_BASE_URL") or settings.llm_base_url or "https://api.openai.com/v1",
        }
    elif provider == "ollama":
        return {
            "provider": "ollama",
            "model": os.getenv("LLM_CHOICE") or settings.llm_choice or settings.ollama_model,
            "base_url": os.getenv("LLM_BASE_URL") or settings.llm_base_url or settings.ollama_base_url,
        }
    elif provider == "groq":
        return {
            "provider": "groq",
            "model": os.getenv("LLM_CHOICE") or settings.llm_choice or settings.groq_model,
            "api_key": os.getenv("LLM_API_KEY") or settings.llm_api_key or settings.groq_api_key,
        }
    elif provider == "anthropic":
        return {
            "provider": "anthropic",
            "model": os.getenv("LLM_CHOICE") or settings.llm_choice or settings.anthropic_model or "claude-3-5-haiku-20241022",
            "api_key": os.getenv("LLM_API_KEY") or settings.llm_api_key or settings.anthropic_api_key,
        }
    else:
        # Default to mock/ollama for development
        logger.warning(f"Unknown LLM provider: {provider}, defaulting to ollama")
        return {
            "provider": "ollama",
            "model": settings.ollama_model,
            "base_url": settings.ollama_base_url,
        }


# Mem0 configuration (adapted from reference)
def get_mem0_config() -> dict[str, Any]:
    """
    Get Mem0 configuration for cross-session memory.

    Uses PostgreSQL vector store with UGOKI's database.
    """
    llm_config = get_llm_config()
    embedding_model = os.getenv("EMBEDDING_MODEL_CHOICE", "text-embedding-3-small")
    embedding_provider = os.getenv("EMBEDDING_PROVIDER", "openai")

    config: dict[str, Any] = {}

    # LLM config
    if llm_config["provider"] == "openai":
        config["llm"] = {
            "provider": "openai",
            "config": {
                "model": llm_config["model"],
                "temperature": 0.2,
                "max_tokens": 2000,
            }
        }
        if llm_config.get("api_key"):
            os.environ["OPENAI_API_KEY"] = llm_config["api_key"]
    elif llm_config["provider"] == "ollama":
        config["llm"] = {
            "provider": "ollama",
            "config": {
                "model": llm_config["model"],
                "temperature": 0.2,
                "max_tokens": 2000,
                "ollama_base_url": llm_config.get("base_url", "http://localhost:11434").replace("/v1", ""),
            }
        }

    # Embedder config
    if embedding_provider == "openai":
        config["embedder"] = {
            "provider": "openai",
            "config": {
                "model": embedding_model,
                "embedding_dims": 1536,
            }
        }
    elif embedding_provider == "ollama":
        config["embedder"] = {
            "provider": "ollama",
            "config": {
                "model": embedding_model or "nomic-embed-text",
                "embedding_dims": 768,
            }
        }

    # Vector store - use PostgreSQL with UGOKI's database
    database_url = os.getenv("DATABASE_URL") or str(settings.database_url)
    if database_url:
        config["vector_store"] = {
            "provider": "pgvector",
            "config": {
                "connection_string": database_url,
                "collection_name": "coach_memories",
                "embedding_model_dims": 1536 if embedding_provider == "openai" else 768,
            }
        }

    return config
