#!/usr/bin/env python
"""Document ingestion script for RAG knowledge base.

Usage:
    # Ingest all docs from a directory
    uv run python scripts/ingest_documents.py --source ../docs/guides

    # Clear existing documents and re-ingest
    uv run python scripts/ingest_documents.py --source ../docs --clear

    # Ingest with custom chunk size
    uv run python scripts/ingest_documents.py --source ../docs --chunk-size 500 --overlap 100
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Iterator

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from openai import OpenAI
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.modules.ai_coach.orm import CoachDocumentORM


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> Iterator[str]:
    """Split text into overlapping chunks.

    Args:
        text: The text to split
        chunk_size: Target size for each chunk
        overlap: Number of characters to overlap between chunks

    Yields:
        Text chunks
    """
    if len(text) <= chunk_size:
        yield text
        return

    start = 0
    while start < len(text):
        # Find the end of this chunk
        end = start + chunk_size

        # If we're not at the end, try to break at a sentence or paragraph
        if end < len(text):
            # Look for a good break point within the last 100 chars
            break_chars = ['\n\n', '\n', '. ', '? ', '! ']
            best_break = end

            for char in break_chars:
                pos = text.rfind(char, start + chunk_size - 100, end)
                if pos != -1:
                    best_break = pos + len(char)
                    break

            end = best_break

        yield text[start:end].strip()

        # Move start, accounting for overlap
        start = max(start + 1, end - overlap)


def read_file(file_path: Path) -> str | None:
    """Read content from a file.

    Supports: .md, .txt, .py (code files)
    """
    suffix = file_path.suffix.lower()

    supported = {'.md', '.txt', '.py', '.rst', '.json'}
    if suffix not in supported:
        print(f"  Skipping unsupported file type: {file_path}")
        return None

    try:
        content = file_path.read_text(encoding='utf-8')
        return content
    except Exception as e:
        print(f"  Error reading {file_path}: {e}")
        return None


def get_embedding(client: OpenAI, text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Generate embedding for text using OpenAI API."""
    response = client.embeddings.create(
        input=text,
        model=model,
    )
    return response.data[0].embedding


async def ingest_documents(
    source_path: Path,
    clear: bool = False,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> None:
    """Ingest documents from source path into the database.

    Args:
        source_path: Path to directory containing documents
        clear: If True, clear existing documents before ingesting
        chunk_size: Target size for each chunk
        overlap: Number of characters to overlap between chunks
    """
    # Check for API key
    api_key = settings.embedding_api_key or settings.llm_api_key
    if not api_key:
        print("Error: No embedding API key found. Set EMBEDDING_API_KEY or LLM_API_KEY")
        sys.exit(1)

    # Initialize OpenAI client
    openai_client = OpenAI(api_key=api_key)
    model = settings.embedding_model_choice or "text-embedding-3-small"

    # Create async engine
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Clear existing documents if requested
        if clear:
            print("Clearing existing documents...")
            await db.execute(delete(CoachDocumentORM))
            await db.commit()
            print("  Cleared.")

        # Find all files
        if source_path.is_file():
            files = [source_path]
        else:
            files = list(source_path.rglob('*'))
            files = [f for f in files if f.is_file()]

        print(f"Found {len(files)} files in {source_path}")

        total_chunks = 0
        for file_path in files:
            content = read_file(file_path)
            if not content:
                continue

            # Generate chunks
            chunks = list(chunk_text(content, chunk_size, overlap))
            print(f"  {file_path.name}: {len(chunks)} chunks")

            for i, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue

                # Generate embedding
                try:
                    embedding = get_embedding(openai_client, chunk, model)
                except Exception as e:
                    print(f"    Error generating embedding for chunk {i}: {e}")
                    continue

                # Create document record
                doc = CoachDocumentORM(
                    content=chunk,
                    doc_metadata={
                        "source": str(file_path.relative_to(source_path.parent)),
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    },
                    embedding=embedding,
                    identity_id=None,  # Global document, not user-specific
                )
                db.add(doc)
                total_chunks += 1

        await db.commit()
        print(f"\nIngested {total_chunks} chunks from {len(files)} files")

    await engine.dispose()


async def verify_ingestion() -> None:
    """Verify that documents were ingested correctly."""
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM coach_documents"))
        count = result.scalar()
        print(f"\nTotal documents in database: {count}")

        # Sample a document
        if count > 0:
            result = await db.execute(
                text("SELECT content, metadata FROM coach_documents LIMIT 1")
            )
            row = result.fetchone()
            if row:
                print(f"\nSample document:")
                print(f"  Content (first 200 chars): {row[0][:200]}...")
                print(f"  Metadata: {row[1]}")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Ingest documents into RAG knowledge base")
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Path to directory containing documents to ingest",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing documents before ingesting",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Target size for each chunk (default: 1000)",
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=200,
        help="Number of characters to overlap between chunks (default: 200)",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify ingestion after completion",
    )

    args = parser.parse_args()

    if not args.source.exists():
        print(f"Error: Source path does not exist: {args.source}")
        sys.exit(1)

    asyncio.run(ingest_documents(
        source_path=args.source,
        clear=args.clear,
        chunk_size=args.chunk_size,
        overlap=args.overlap,
    ))

    if args.verify:
        asyncio.run(verify_ingestion())


if __name__ == "__main__":
    main()
