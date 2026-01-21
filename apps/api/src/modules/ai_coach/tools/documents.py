"""Document retrieval tools for UGOKI AI Coach (RAG)."""

import hashlib
import logging
import os
import time
from typing import List

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Embedding cache with TTL support
# Structure: {cache_key: (embedding, timestamp)}
_embedding_cache: dict[str, tuple[list[float], float]] = {}
_CACHE_MAX_SIZE = 1000
_CACHE_TTL_SECONDS = 3600  # 1 hour


def _get_cache_key(text: str) -> str:
    """Generate a cache key from text."""
    normalized = text.lower().strip()
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def _cleanup_cache() -> None:
    """Remove expired entries and enforce size limit."""
    global _embedding_cache
    now = time.time()

    # Remove expired entries
    expired_keys = [
        k for k, (_, ts) in _embedding_cache.items()
        if now - ts > _CACHE_TTL_SECONDS
    ]
    for k in expired_keys:
        del _embedding_cache[k]

    # Enforce size limit (remove oldest entries)
    if len(_embedding_cache) > _CACHE_MAX_SIZE:
        sorted_items = sorted(_embedding_cache.items(), key=lambda x: x[1][1])
        to_remove = len(_embedding_cache) - _CACHE_MAX_SIZE
        for k, _ in sorted_items[:to_remove]:
            del _embedding_cache[k]


async def get_embedding(
    text_content: str,
    embedding_client: AsyncOpenAI,
    use_cache: bool = True,
) -> List[float]:
    """
    Get embedding vector from OpenAI with caching support.

    Args:
        text_content: Text to embed
        embedding_client: OpenAI client for embeddings
        use_cache: Whether to use the embedding cache (default: True)

    Returns:
        Embedding vector
    """
    cache_key = _get_cache_key(text_content)

    # Check cache first
    if use_cache and cache_key in _embedding_cache:
        embedding, timestamp = _embedding_cache[cache_key]
        if time.time() - timestamp < _CACHE_TTL_SECONDS:
            logger.debug(f"Embedding cache hit for key {cache_key[:8]}...")
            return embedding
        else:
            # Expired, remove it
            del _embedding_cache[cache_key]

    embedding_model = os.getenv("EMBEDDING_MODEL_CHOICE", "text-embedding-3-small")

    try:
        start_time = time.time()
        response = await embedding_client.embeddings.create(
            model=embedding_model,
            input=text_content,
        )
        embedding = response.data[0].embedding
        elapsed_ms = (time.time() - start_time) * 1000
        logger.debug(f"Embedding generated in {elapsed_ms:.1f}ms")

        # Store in cache
        if use_cache:
            _embedding_cache[cache_key] = (embedding, time.time())
            # Periodic cleanup
            if len(_embedding_cache) % 100 == 0:
                _cleanup_cache()

        return embedding
    except Exception as e:
        logger.error(f"Error getting embedding: {e}")
        # Return zero vector on error (1536 dimensions for text-embedding-3-small)
        return [0.0] * 1536


def get_embedding_cache_stats() -> dict:
    """Get statistics about the embedding cache."""
    now = time.time()
    valid_count = sum(
        1 for _, (_, ts) in _embedding_cache.items()
        if now - ts < _CACHE_TTL_SECONDS
    )
    return {
        "total_entries": len(_embedding_cache),
        "valid_entries": valid_count,
        "expired_entries": len(_embedding_cache) - valid_count,
        "max_size": _CACHE_MAX_SIZE,
        "ttl_seconds": _CACHE_TTL_SECONDS,
    }


def clear_embedding_cache() -> int:
    """Clear the embedding cache. Returns number of entries cleared."""
    global _embedding_cache
    count = len(_embedding_cache)
    _embedding_cache = {}
    return count


async def retrieve_documents(
    query: str,
    db: AsyncSession,
    embedding_client: AsyncOpenAI,
    match_count: int = 4,
) -> str:
    """
    Retrieve relevant document chunks using RAG with vector similarity search.

    Args:
        query: User's question or query
        db: SQLAlchemy async session
        embedding_client: OpenAI client for embeddings
        match_count: Number of results to return

    Returns:
        Formatted string of relevant document chunks
    """
    try:
        start_time = time.time()

        # Get embedding for the query (with caching)
        query_embedding = await get_embedding(query, embedding_client)
        embedding_time = time.time() - start_time

        # Check if we have a documents table with embeddings
        # This uses pgvector for similarity search
        search_start = time.time()
        result = await db.execute(
            text("""
                SELECT
                    content,
                    metadata,
                    1 - (embedding <=> :embedding::vector) as similarity
                FROM coach_documents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> :embedding::vector
                LIMIT :match_count
            """),
            {
                "embedding": str(query_embedding),
                "match_count": match_count,
            },
        )
        rows = result.fetchall()
        search_time = time.time() - search_start

        total_time = time.time() - start_time
        logger.info(
            f"RAG retrieval: embedding={embedding_time*1000:.1f}ms, "
            f"search={search_time*1000:.1f}ms, total={total_time*1000:.1f}ms, "
            f"results={len(rows)}"
        )

        if not rows:
            return "No relevant documents found in the knowledge base."

        # Format the results
        formatted_chunks = []
        for row in rows:
            content = row[0]
            metadata = row[1] or {}
            similarity = row[2]

            chunk_text = f"""
## {metadata.get('title', 'Document')}
**Relevance: {similarity:.2%}**

{content}
"""
            formatted_chunks.append(chunk_text)

        return "\n---\n".join(formatted_chunks)

    except Exception as e:
        logger.error(f"Error retrieving documents: {e}")
        # Return helpful message if RAG is not set up
        return (
            "The knowledge base is not currently available. "
            "I'll provide guidance based on my training data."
        )


async def list_available_documents(db: AsyncSession) -> str:
    """
    List all available documents in the knowledge base.

    Args:
        db: SQLAlchemy async session

    Returns:
        Formatted list of available documents
    """
    try:
        result = await db.execute(
            text("""
                SELECT DISTINCT
                    metadata->>'document_id' as doc_id,
                    metadata->>'title' as title,
                    metadata->>'category' as category
                FROM coach_documents
                WHERE metadata->>'document_id' IS NOT NULL
                ORDER BY metadata->>'category', metadata->>'title'
            """)
        )
        rows = result.fetchall()

        if not rows:
            return "No documents available in the knowledge base."

        # Group by category
        categories: dict[str, list[tuple]] = {}
        for row in rows:
            doc_id, title, category = row
            cat = category or "General"
            if cat not in categories:
                categories[cat] = []
            categories[cat].append((doc_id, title))

        # Format output
        lines = ["## Available Documents\n"]
        for category, docs in sorted(categories.items()):
            lines.append(f"\n### {category}")
            for doc_id, title in docs:
                lines.append(f"- **{title}** (ID: {doc_id})")

        return "\n".join(lines)

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        return "Unable to list documents at this time."


async def get_document_by_id(
    document_id: str,
    db: AsyncSession,
) -> str:
    """
    Get the full content of a specific document.

    Args:
        document_id: The ID of the document to retrieve
        db: SQLAlchemy async session

    Returns:
        Full document content
    """
    try:
        result = await db.execute(
            text("""
                SELECT
                    content,
                    metadata->>'title' as title,
                    metadata->>'chunk_index' as chunk_idx
                FROM coach_documents
                WHERE metadata->>'document_id' = :doc_id
                ORDER BY (metadata->>'chunk_index')::int
            """),
            {"doc_id": document_id},
        )
        rows = result.fetchall()

        if not rows:
            return f"Document not found: {document_id}"

        # Combine all chunks
        title = rows[0][1] or document_id
        content_parts = [f"# {title}\n"]

        for row in rows:
            content_parts.append(row[0])

        # Limit total length
        full_content = "\n\n".join(content_parts)
        if len(full_content) > 20000:
            full_content = full_content[:20000] + "\n\n[Document truncated...]"

        return full_content

    except Exception as e:
        logger.error(f"Error getting document: {e}")
        return f"Error retrieving document: {str(e)}"
