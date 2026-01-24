# Testing Guide

Testing strategy and patterns for UGOKI.

---

## Testing Strategy

| Type | Coverage | Purpose |
|------|----------|---------|
| Unit | 70% | Test modules in isolation |
| Integration | 25% | Test module interactions |
| E2E | 5% | Full user flows |

---

## Backend Testing

### Setup

```bash
cd apps/api

# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific file
uv run pytest tests/test_time_keeper.py

# Run specific test
uv run pytest tests/test_time_keeper.py::test_start_fast -v

# Run with coverage
uv run pytest --cov=src --cov-report=html
```

### Unit Test Pattern

```python
# tests/test_time_keeper.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.modules.time_keeper.service import TimeKeeperService
from src.modules.time_keeper.models import TimeWindow

@pytest.mark.asyncio
async def test_start_fast():
    # Arrange
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    service = TimeKeeperService(mock_db)

    # Act
    result = await service.open_window(
        identity_id="test-identity-id",
        window_type="fast",
        protocol="16:8"
    )

    # Assert
    assert result is not None
    assert result.state == "active"
    assert result.window_type == "fast"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
```

### Integration Test Pattern

```python
# tests/integration/test_fasting_flow.py
import pytest
from httpx import AsyncClient
from src.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_fasting_flow(client):
    # Create fasting window
    response = await client.post("/api/v1/time-keeper/windows", json={
        "window_type": "fast",
        "protocol": "16:8"
    }, headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    window_id = response.json()["id"]

    # Check active window
    response = await client.get("/api/v1/time-keeper/windows/active",
        headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    assert response.json()["id"] == window_id

    # Close window (complete fast)
    response = await client.post(f"/api/v1/time-keeper/windows/{window_id}/close",
        headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    assert response.json()["state"] == "completed"
```

### Mocking External Services

```python
# tests/test_ai_coach.py
import pytest
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_coach_chat():
    mock_response = AsyncMock(return_value={
        "message": "Great job on your fast!",
        "tools_used": []
    })

    with patch("src.modules.ai_coach.agent.coach_agent.run", mock_response):
        service = AICoachService(mock_db)
        result = await service.chat("How am I doing?", [])

        assert "Great job" in result.message
```

### Test Database

```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from src.database import Base

@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

    await engine.dispose()
```

---

## Mobile Testing

### Setup

```bash
cd apps/mobile

# Run all tests
bun run test

# Run in watch mode
bun run test --watch

# Run with coverage
bun run test --coverage
```

### Component Test Pattern

```typescript
// features/fasting/components/__tests__/FastingTimer.test.tsx
import { render, screen } from '@testing-library/react-native';
import { FastingTimer } from '../FastingTimer';

describe('FastingTimer', () => {
  it('displays elapsed time', () => {
    const startTime = new Date(Date.now() - 60000); // 1 minute ago

    render(<FastingTimer startTime={startTime} />);

    expect(screen.getByText(/00:01/)).toBeTruthy();
  });

  it('shows pause state', () => {
    render(<FastingTimer startTime={new Date()} isPaused={true} />);

    expect(screen.getByText(/Paused/)).toBeTruthy();
  });
});
```

### Hook Test Pattern

```typescript
// features/fasting/hooks/__tests__/useFasting.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActiveFast } from '../useFasting';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useActiveFast', () => {
  it('returns active fast data', async () => {
    // Mock API response
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { id: '123', state: 'active' }
    });

    const { result } = renderHook(() => useActiveFast(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data.state).toBe('active');
  });
});
```

### Store Test Pattern

```typescript
// features/fasting/stores/__tests__/fastingStore.test.ts
import { useFastingStore } from '../fastingStore';

describe('fastingStore', () => {
  beforeEach(() => {
    useFastingStore.getState().actions.reset();
  });

  it('starts timer', () => {
    const startTime = new Date();
    useFastingStore.getState().actions.start(startTime);

    expect(useFastingStore.getState().isRunning).toBe(true);
    expect(useFastingStore.getState().startTime).toEqual(startTime);
  });

  it('pauses timer', () => {
    useFastingStore.getState().actions.start(new Date());
    useFastingStore.getState().actions.pause();

    expect(useFastingStore.getState().isRunning).toBe(false);
  });
});
```

### Mocking API

```typescript
// jest.setup.js
jest.mock('@/shared/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
```

---

## Test Organization

### Backend
```
tests/
├── conftest.py              # Shared fixtures
├── test_identity.py         # Unit tests by module
├── test_time_keeper.py
├── test_metrics.py
└── integration/             # Integration tests
    ├── test_fasting_flow.py
    └── test_auth_flow.py
```

### Mobile
```
features/
├── fasting/
│   ├── components/
│   │   └── __tests__/
│   │       └── FastingTimer.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useFasting.test.ts
│   └── stores/
│       └── __tests__/
│           └── fastingStore.test.ts
```

---

## Test Guidelines

### Do

- Test behavior, not implementation
- Use descriptive test names
- One assertion per test (when practical)
- Mock external dependencies
- Test edge cases and error states

### Don't

- Test framework code (React, FastAPI)
- Test trivial getters/setters
- Use real external APIs in unit tests
- Skip error handling tests

---

## Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| time_keeper | 80% | - |
| metrics | 80% | - |
| progression | 80% | - |
| ai_coach | 70% | - |
| research | 70% | - |

---

## References

- **Backend Guide:** [BACKEND.md](BACKEND.md)
- **Mobile Guide:** [MOBILE.md](MOBILE.md)
- **Patterns:** [architecture/PATTERNS.md](../architecture/PATTERNS.md)
