---
name: ugoki-testing
description: >
  UGOKI testing with pytest and the comprehensive API test script. Load when:
  writing tests, creating fixtures, mocking services, running test suites, or
  debugging test failures. Keywords: test, pytest, fixture, mock, assert,
  async, test_api.py, coverage, TDD.
---

# UGOKI Testing

## Quick Commands

```bash
cd apps/api

# Run all tests
uv run pytest

# Verbose output
uv run pytest -v

# Specific file
uv run pytest tests/test_items.py

# Specific test function
uv run pytest tests/test_items.py::test_create_item -v

# With print output (useful for debugging)
uv run pytest -v -s

# Stop on first failure
uv run pytest -x

# Run last failed tests only
uv run pytest --lf

# With coverage report
uv run pytest --cov=src --cov-report=html
open htmlcov/index.html

# Run comprehensive API test (64 endpoints)
uv run python scripts/test_api.py
```

---

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures
├── test_identity.py         # Unit tests per module
├── test_time_keeper.py
├── test_metrics.py
├── test_progression.py
├── test_content.py
├── test_ai_coach.py
└── integration/             # Cross-module tests
    └── test_fasting_flow.py
```

---

## Fixtures (`conftest.py`)

```python
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.db.database import Base
import os

TEST_DB_PATH = "test_ugoki.db"


@pytest.fixture(scope="function", autouse=True)
def clean_test_db():
    """Fresh database for each test."""
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest_asyncio.fixture
async def db_session():
    """Async database session."""
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{TEST_DB_PATH}",
        echo=False
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    await engine.dispose()


@pytest_asyncio.fixture
async def identity(db_session):
    """Test identity."""
    from src.modules.identity.orm import IdentityORM
    
    identity = IdentityORM(
        id="test_id_123",
        provider="anonymous"
    )
    db_session.add(identity)
    await db_session.commit()
    return identity


@pytest_asyncio.fixture
async def identity_with_profile(db_session, identity):
    """Identity with associated profile."""
    from src.modules.profile.orm import ProfileORM
    
    profile = ProfileORM(
        id="test_profile_123",
        identity_id=identity.id,
        display_name="Test User",
        email="test@example.com"
    )
    db_session.add(profile)
    await db_session.commit()
    return identity


@pytest.fixture
def auth_token(identity):
    """JWT token for API tests."""
    from src.core.security import create_access_token
    return create_access_token({"sub": identity.id})


@pytest.fixture
def auth_headers(auth_token):
    """Auth headers for API requests."""
    return {"Authorization": f"Bearer {auth_token}"}
```

---

## Unit Test Patterns

### Service Tests

```python
import pytest
from src.modules.items.service import ItemService
from src.modules.items.models import CreateItemRequest

@pytest.mark.asyncio
async def test_create_item(db_session, identity):
    """Test creating an item."""
    service = ItemService(db_session)
    
    request = CreateItemRequest(name="Test Item", value=42.0)
    item = await service.create(identity.id, request)
    
    assert item.id.startswith("item_")
    assert item.name == "Test Item"
    assert item.value == 42.0


@pytest.mark.asyncio
async def test_create_item_validates_name(db_session, identity):
    """Test that empty name is rejected."""
    service = ItemService(db_session)
    
    with pytest.raises(ValueError):
        CreateItemRequest(name="", value=10.0)


@pytest.mark.asyncio
async def test_get_item_not_found(db_session):
    """Test getting non-existent item returns None."""
    service = ItemService(db_session)
    
    item = await service.get_by_id("nonexistent_id")
    
    assert item is None


@pytest.mark.asyncio
async def test_list_items_empty(db_session, identity):
    """Test listing items when none exist."""
    service = ItemService(db_session)
    
    result = await service.list_for_user(identity.id)
    
    assert result.items == []
    assert result.total == 0


@pytest.mark.asyncio
async def test_list_items_ordered_by_date(db_session, identity):
    """Test items returned newest first."""
    service = ItemService(db_session)
    
    # Create in order
    item1 = await service.create(identity.id, CreateItemRequest(name="First", value=1))
    item2 = await service.create(identity.id, CreateItemRequest(name="Second", value=2))
    
    result = await service.list_for_user(identity.id)
    
    assert len(result.items) == 2
    assert result.items[0].name == "Second"  # Most recent first
    assert result.items[1].name == "First"


@pytest.mark.asyncio
async def test_soft_delete(db_session, identity):
    """Test soft delete sets deleted_at."""
    service = ItemService(db_session)
    
    item = await service.create(identity.id, CreateItemRequest(name="Delete Me", value=1))
    
    deleted = await service.soft_delete(item.id)
    assert deleted is True
    
    # Should not be found now
    found = await service.get_by_id(item.id)
    assert found is None
```

---

## API Endpoint Tests

```python
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app

@pytest.mark.asyncio
async def test_create_item_endpoint(db_session, identity, auth_headers):
    """Test POST /items endpoint."""
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/items",
            json={"name": "API Test", "value": 99.0},
            headers=auth_headers
        )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "API Test"
    assert data["value"] == 99.0
    assert "id" in data


@pytest.mark.asyncio
async def test_create_item_unauthenticated(db_session):
    """Test endpoint requires auth."""
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/items",
            json={"name": "Test", "value": 1.0}
            # No auth headers
        )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_item_validation_error(db_session, auth_headers):
    """Test validation error response."""
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/items",
            json={"name": "", "value": -1},  # Invalid
            headers=auth_headers
        )
    
    assert response.status_code == 422
    assert "detail" in response.json()
```

---

## Mocking Patterns

### Mock External API

```python
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_with_mocked_external_api(db_session):
    """Mock external HTTP calls."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"status": "success", "data": [1, 2, 3]}
    mock_response.status_code = 200
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        
        service = ExternalService(db_session)
        result = await service.fetch_data()
        
        assert result["status"] == "success"
        mock_get.assert_called_once()
```

### Mock Claude/AI

```python
@pytest.mark.asyncio
async def test_ai_coach_mocked():
    """Mock Pydantic AI agent."""
    mock_result = MagicMock()
    mock_result.data = CoachResponse(
        message="Test response",
        suggestions=[],
        tools_used=[]
    )
    
    with patch.object(coach_agent, 'run', new_callable=AsyncMock) as mock_run:
        mock_run.return_value = mock_result
        
        # Test code that uses the agent
        response = await chat_service.process("Hello")
        
        assert response.message == "Test response"
```

### Mock Time

```python
from freezegun import freeze_time

@pytest.mark.asyncio
@freeze_time("2024-01-15 10:00:00")
async def test_with_frozen_time(db_session, identity):
    """Test time-dependent logic."""
    service = TimeKeeperService(db_session)
    
    window = await service.open_window(identity.id, "fasting")
    
    assert window.started_at.hour == 10
```

---

## Comprehensive API Test Script

Located at `scripts/test_api.py` - tests all 64 endpoints end-to-end:

```bash
# Run it (server must be running)
uv run python scripts/test_api.py

# Output:
# ============================================================
# UGOKI API COMPREHENSIVE TEST
# ============================================================
# 
# IDENTITY MODULE
# ✅ Health check
# ✅ Create anonymous identity
# ✅ Refresh token
# 
# TIME_KEEPER MODULE
# ✅ Start fasting window
# ✅ Get active window
# ✅ Pause window
# ...
# 
# ============================================================
# ✅ All 64 tests passed!
```

---

## Test Categories & Coverage

| Category | Location | Coverage % | Purpose |
|----------|----------|------------|---------|
| Unit | `tests/test_*.py` | 70% | Service logic |
| Integration | `tests/integration/` | 25% | Module interactions |
| E2E | `scripts/test_api.py` | 5% | Full API validation |

---

## Debugging Test Failures

### Test Can't Find Module

```bash
# Run from apps/api directory
cd apps/api
uv run pytest
```

### Database Not Clean

```python
# Check fixture runs first
@pytest.fixture(scope="function", autouse=True)  # autouse=True is key
def clean_test_db():
    ...
```

### Async Test Not Running

```python
# Must mark as async
@pytest.mark.asyncio
async def test_something():
    ...
```

### Mock Not Working

```python
# Patch where it's USED, not where it's DEFINED
# If service.py imports httpx and uses it:
with patch("src.modules.mymodule.service.httpx.AsyncClient"):
    ...
# NOT:
with patch("httpx.AsyncClient"):  # This won't work
    ...
```

---

## References

- `references/fixtures.md` - Advanced fixture patterns
- `references/mocking.md` - Complete mocking guide
