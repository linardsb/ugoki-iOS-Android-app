# UGOKI API

Backend API for the UGOKI wellness app.

## Quick Start

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn src.main:app --reload
```

API docs available at http://localhost:8000/docs
