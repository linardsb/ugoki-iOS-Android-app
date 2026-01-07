# UGOKI API

Backend API for the UGOKI wellness app - combining Intermittent Fasting with HIIT workouts.

## Tech Stack

- **FastAPI** - Modern async web framework
- **SQLAlchemy 2.0** - Async ORM
- **PostgreSQL** - Production database
- **Pydantic AI** - AI coaching integration

## Quick Start

```bash
# Install dependencies
uv sync

# Run migrations
uv run alembic upgrade head

# Start server
uv run uvicorn src.main:app --reload
```

## Environment Variables

See `.env.example` for configuration options.
