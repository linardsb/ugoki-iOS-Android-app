# Backend Development Guide

Development guide for the UGOKI FastAPI backend.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.12+ |
| ORM | SQLAlchemy 2.0 (async) |
| Validation | Pydantic 2.0 |
| Migrations | Alembic |
| Package Manager | uv |
| AI | Pydantic AI + Claude |

---

## Project Structure

```
apps/api/
├── src/
│   ├── main.py                    # App entry point
│   ├── database.py                # Database configuration
│   ├── dependencies.py            # FastAPI dependencies
│   ├── modules/                   # Black box modules
│   │   ├── identity/
│   │   ├── time_keeper/
│   │   ├── metrics/
│   │   ├── progression/
│   │   ├── content/
│   │   ├── ai_coach/
│   │   ├── notification/
│   │   ├── profile/
│   │   ├── event_journal/
│   │   ├── social/
│   │   └── research/
│   ├── routes/                    # Non-module routes
│   │   └── uploads.py             # File upload handling
│   └── services/                  # Shared services
│       └── bloodwork_parser.py    # AI parsing
├── scripts/                       # Utility scripts
│   └── seed_workouts.py           # Seed data
├── tests/                         # Test suite
├── alembic/                       # Migrations
├── pyproject.toml                 # Dependencies
└── .env                           # Environment config
```

---

## Commands

```bash
# Install dependencies
uv sync

# Start dev server
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
uv run pytest

# Run specific test
uv run pytest tests/test_time_keeper.py -v

# Create migration
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Rollback migration
uv run alembic downgrade -1

# Seed data
uv run python scripts/seed_workouts.py
```

---

## Creating a New Module

### 1. Create Module Directory

```bash
mkdir -p src/modules/my_module
touch src/modules/my_module/{__init__,interface,service,routes,models,orm}.py
```

### 2. Define Interface

```python
# src/modules/my_module/interface.py
from abc import ABC, abstractmethod
from .models import MyModel

class MyModuleInterface(ABC):
    @abstractmethod
    async def create(self, data: dict) -> MyModel:
        """Create a new record."""
        pass

    @abstractmethod
    async def get(self, id: str) -> MyModel | None:
        """Get record by ID."""
        pass
```

### 3. Create ORM Model

```python
# src/modules/my_module/orm.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base
import uuid

class MyModelORM(Base):
    __tablename__ = "my_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 4. Create Pydantic Models

```python
# src/modules/my_module/models.py
from pydantic import BaseModel
from datetime import datetime

class MyModelCreate(BaseModel):
    name: str

class MyModelResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### 5. Implement Service

```python
# src/modules/my_module/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from .interface import MyModuleInterface
from .orm import MyModelORM
from .models import MyModel

class MyModuleService(MyModuleInterface):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> MyModel:
        orm = MyModelORM(**data)
        self.db.add(orm)
        await self.db.commit()
        await self.db.refresh(orm)
        return self._to_model(orm)

    async def get(self, id: str) -> MyModel | None:
        result = await self.db.get(MyModelORM, id)
        return self._to_model(result) if result else None

    def _to_model(self, orm: MyModelORM) -> MyModel:
        return MyModel(
            id=str(orm.id),
            name=orm.name,
            created_at=orm.created_at
        )
```

### 6. Create Routes

```python
# src/modules/my_module/routes.py
from fastapi import APIRouter, Depends
from .service import MyModuleService
from .models import MyModelCreate, MyModelResponse

router = APIRouter(prefix="/my-module", tags=["my-module"])

@router.post("/", response_model=MyModelResponse)
async def create(
    data: MyModelCreate,
    service: MyModuleService = Depends(get_my_module_service)
):
    return await service.create(data.model_dump())

@router.get("/{id}", response_model=MyModelResponse)
async def get(
    id: str,
    service: MyModuleService = Depends(get_my_module_service)
):
    result = await service.get(id)
    if not result:
        raise HTTPException(404, "Not found")
    return result
```

### 7. Register Routes

```python
# src/main.py
from src.modules.my_module.routes import router as my_module_router

app.include_router(my_module_router, prefix="/api/v1")
```

### 8. Create Migration

```bash
uv run alembic revision --autogenerate -m "add my_models table"
uv run alembic upgrade head
```

---

## Database Patterns

### Async Queries

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_by_identity(db: AsyncSession, identity_id: str):
    result = await db.execute(
        select(MyModelORM).where(MyModelORM.identity_id == identity_id)
    )
    return result.scalars().all()
```

### Transactions

```python
async def create_with_related(db: AsyncSession, data: dict):
    async with db.begin():
        parent = ParentORM(**data)
        db.add(parent)
        await db.flush()  # Get ID before commit

        child = ChildORM(parent_id=parent.id)
        db.add(child)
        # Commits at end of context
```

### Timezone-Aware Timestamps

```python
from sqlalchemy import DateTime
from datetime import datetime, timezone

# Always use timezone=True
created_at = Column(DateTime(timezone=True), server_default=func.now())

# In code
now = datetime.now(timezone.utc)
```

---

## AI Integration

### Pydantic AI Agent

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel

class CoachDependencies(BaseModel):
    identity_id: str
    time_keeper: TimeKeeperInterface
    metrics: MetricsInterface

coach_agent = Agent(
    "anthropic:claude-3-5-sonnet-latest",
    deps_type=CoachDependencies,
    result_type=CoachResponse,
    system_prompt="You are UGOKI Coach..."
)

@coach_agent.tool
async def get_active_fast(ctx: RunContext[CoachDependencies]) -> dict | None:
    window = await ctx.deps.time_keeper.get_active_window(
        ctx.deps.identity_id, "fast"
    )
    return window.model_dump() if window else None
```

### Safety Filtering

```python
# src/modules/ai_coach/safety.py
BLOCKED_TOPICS = ["diabetes", "heart disease", "medication"]
EMERGENCY_KEYWORDS = ["chest pain", "can't breathe"]

def check_message_safety(message: str) -> SafetyResult:
    message_lower = message.lower()

    for keyword in EMERGENCY_KEYWORDS:
        if keyword in message_lower:
            return SafetyResult(safe=False, redirect="emergency")

    for topic in BLOCKED_TOPICS:
        if topic in message_lower:
            return SafetyResult(safe=False, reason="medical_advice")

    return SafetyResult(safe=True)
```

---

## Deployment

### Fly.io Deployment

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly apps create ugoki-api

# Set secrets
fly secrets set DATABASE_URL="..."
fly secrets set ANTHROPIC_API_KEY="..."

# Deploy
fly deploy
```

### fly.toml

```toml
app = "ugoki-api"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true

[[services.ports]]
  port = 443
  handlers = ["tls", "http"]
```

---

## Monitoring

### Logfire Integration

```python
import logfire

logfire.configure()

@app.middleware("http")
async def log_requests(request, call_next):
    with logfire.span("http_request", method=request.method, path=request.url.path):
        response = await call_next(request)
        logfire.info("request_complete", status=response.status_code)
        return response
```

### Sentry Integration

```python
import sentry_sdk

sentry_sdk.init(
    dsn="...",
    traces_sample_rate=0.1,
)
```

---

## References

- **Module Specs:** [architecture/MODULES.md](../architecture/MODULES.md)
- **Patterns:** [architecture/PATTERNS.md](../architecture/PATTERNS.md)
- **Testing:** [TESTING.md](TESTING.md)
