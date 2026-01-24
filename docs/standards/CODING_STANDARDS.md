# UGOKI Coding Standards

Style guide, naming conventions, and code organization rules.

---

## General Principles

1. **Clarity over cleverness** - Write code that is easy to read
2. **Consistency** - Follow existing patterns in the codebase
3. **Single responsibility** - Each function/class does one thing
4. **Minimal changes** - Only change what's necessary for the task
5. **No premature optimization** - Make it work, then make it fast

---

## Python (Backend)

### Style

- Follow PEP 8
- Use `ruff` for linting/formatting
- Maximum line length: 100 characters
- Use type hints for all function signatures

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Module | snake_case | `time_keeper.py` |
| Class | PascalCase | `TimeKeeperService` |
| Function | snake_case | `get_active_window` |
| Variable | snake_case | `window_type` |
| Constant | UPPER_SNAKE | `MAX_FAST_DURATION` |
| Private | _prefix | `_to_model` |

### Imports

```python
# Standard library
import uuid
from datetime import datetime

# Third-party
from fastapi import APIRouter, Depends
from sqlalchemy import select

# Local
from src.database import get_db
from .models import TimeWindow
```

### Function Structure

```python
async def open_window(
    self,
    identity_id: str,
    window_type: str,
    protocol: str | None = None,
) -> TimeWindow:
    """
    Open a new time window.

    Args:
        identity_id: The identity opening the window
        window_type: Type of window (fast, eating, workout)
        protocol: Optional protocol (16:8, 18:6, etc.)

    Returns:
        The created TimeWindow

    Raises:
        ValueError: If window type is invalid
    """
    # Implementation
```

### Error Handling

```python
# Use specific exceptions
class WindowAlreadyActiveError(Exception):
    pass

# Raise with context
if active_window:
    raise WindowAlreadyActiveError(
        f"Active {window_type} window already exists: {active_window.id}"
    )

# HTTP errors in routes only
from fastapi import HTTPException

@router.post("/start")
async def start_fast(...):
    try:
        return await service.open_window(...)
    except WindowAlreadyActiveError as e:
        raise HTTPException(400, str(e))
```

---

## TypeScript (Mobile)

### Style

- Follow ESLint configuration
- Use Prettier for formatting
- Maximum line length: 100 characters
- Use TypeScript strict mode

### Naming

| Type | Convention | Example |
|------|------------|---------|
| File (component) | PascalCase | `FastingTimer.tsx` |
| File (hook) | camelCase | `useFasting.ts` |
| Component | PascalCase | `FastingTimer` |
| Hook | useCamelCase | `useActiveFast` |
| Function | camelCase | `formatDuration` |
| Variable | camelCase | `startTime` |
| Constant | UPPER_SNAKE | `MAX_DURATION` |
| Type/Interface | PascalCase | `TimeWindow` |

### Imports

```typescript
// React
import React, { useState, useEffect } from 'react';

// Third-party
import { useQuery } from '@tanstack/react-query';
import { YStack, Text } from 'tamagui';

// Local - absolute imports
import { api } from '@/shared/api/client';
import { ScreenHeader } from '@/shared/components/ui';

// Local - relative imports
import { FastingTimer } from './FastingTimer';
import type { TimeWindow } from '../types';
```

### Component Structure

```typescript
// Type definitions first
interface FastingTimerProps {
  startTime: Date;
  isPaused?: boolean;
  onEnd?: () => void;
}

// Component
export function FastingTimer({
  startTime,
  isPaused = false,
  onEnd,
}: FastingTimerProps) {
  // Hooks
  const [elapsed, setElapsed] = useState(0);
  const { data: settings } = useSettings();

  // Effects
  useEffect(() => {
    // Timer logic
  }, [startTime, isPaused]);

  // Handlers
  const handleEnd = () => {
    onEnd?.();
  };

  // Render
  return (
    <YStack>
      <Text>{formatDuration(elapsed)}</Text>
    </YStack>
  );
}
```

### Type Definitions

```typescript
// types.ts
export interface TimeWindow {
  id: string;
  windowType: 'fast' | 'eating' | 'workout';
  startTime: string; // ISO date string
  endTime: string | null;
  state: 'active' | 'paused' | 'completed' | 'abandoned';
}

// Use discriminated unions for states
export type FastState =
  | { status: 'idle' }
  | { status: 'active'; startTime: Date }
  | { status: 'paused'; startTime: Date; pausedAt: Date };
```

---

## Database

### Table Naming
- Snake_case, plural: `time_windows`, `user_profiles`
- Module prefix when ambiguous: `research_papers`

### Column Naming
- Snake_case: `created_at`, `identity_id`
- Foreign keys: `{table_singular}_id` → `identity_id`
- Timestamps: `created_at`, `updated_at`, `started_at`
- Booleans: `is_active`, `has_completed`

### Always Use
- UUID for primary keys
- `DateTime(timezone=True)` for timestamps
- Indexes on frequently queried columns
- NOT NULL unless explicitly optional

```python
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
identity_id = Column(UUID(as_uuid=True), ForeignKey("identities.id"), nullable=False, index=True)
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

---

## API Design

### Endpoints

```
GET    /api/v1/{module}/{resource}         # List
POST   /api/v1/{module}/{resource}         # Create
GET    /api/v1/{module}/{resource}/{id}    # Read
PATCH  /api/v1/{module}/{resource}/{id}    # Update
DELETE /api/v1/{module}/{resource}/{id}    # Delete
```

### Request/Response

```python
# Request model
class StartFastRequest(BaseModel):
    protocol: str = "16:8"

# Response model
class TimeWindowResponse(BaseModel):
    id: str
    window_type: str
    state: str
    start_time: datetime
    end_time: datetime | None

    class Config:
        from_attributes = True
```

---

## File Organization

### Backend Module
```
module/
├── __init__.py           # Exports
├── interface.py          # Abstract interface
├── service.py            # Implementation
├── routes.py             # HTTP handlers
├── models.py             # Pydantic models
├── orm.py                # SQLAlchemy models
└── tests/                # Module tests
```

### Mobile Feature
```
feature/
├── index.ts              # Exports
├── types.ts              # Types
├── hooks/                # React Query hooks
├── components/           # Components
└── stores/               # Zustand stores
```

---

## Comments

### When to Comment
- Complex algorithms
- Non-obvious business logic
- Workarounds and their reasons
- TODO items (with ticket reference)

### When NOT to Comment
- Obvious code
- Every function (use good names instead)
- Commented-out code (delete it)

```python
# Good: explains WHY
# We need to check both states because pause doesn't update end_time
if window.state in ("active", "paused") and not window.end_time:

# Bad: explains WHAT (obvious from code)
# Check if window is active
if window.state == "active":
```

---

## Git

### Commit Messages

```
<type>: <description>

<optional body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Adding tests
- `chore`: Maintenance

### Branch Names

```
feature/add-workout-timer
fix/fasting-pause-bug
refactor/metrics-service
```

---

## Health Data Handling

Health data from devices (HealthKit/Health Connect) requires special handling as Protected Health Information (PHI):

### Python - Always Track Source

```python
# Backend - Store health metrics with source
async def sync_health_data(
    payload: HealthDataPayload,
    identity_id: str,
    service: MetricsService
):
    # ALWAYS mark source as DEVICE_SYNC
    await service.record(
        identity_id=identity_id,
        metric_type="health_heart_rate",
        value=payload.resting_heart_rate,
        source=MetricSource.DEVICE_SYNC,  # Critical: track source
        timestamp=payload.synced_at
    )
```

### TypeScript - Check Permission First

```typescript
// Mobile - Always verify permission before sync
export function useHealthSync() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (Platform.OS === 'ios' && HealthKit) {
        const authorized = await HealthKit.isAuthorized();
        setIsAuthorized(authorized);
        // If not authorized, don't attempt sync
      }
    };
    checkAuth();
  }, []);

  const syncData = async () => {
    if (!isAuthorized) {
      // Request permission first
      await requestPermissions();
      return;
    }
    // Proceed with sync
  };
}
```

### Never Log Health Data

```python
# BAD - Never do this
logger.info(f"Synced health data: HR={hr}, HRV={hrv}, Sleep={sleep}")

# GOOD - Log only metadata
logger.info(f"Synced {count} health metrics for user")

# GOOD - Log only source
logger.debug(f"Health sync from device: {source}")
```

### Health Data Type Suffix

```python
# Metric types for health data should be prefixed with "health_"
metric_type = "health_heart_rate"     # Good
metric_type = "heart_rate"            # Bad - unclear if manual or device
metric_type = "device_heart_rate"     # Bad - doesn't indicate it's health data

# This enables filtering:
# SELECT * FROM metrics WHERE metric_type LIKE 'health_%'
```

---

## Mobile Storage Architecture

### Understanding the Dual-Layer Approach

Mobile apps use a **two-layer storage system** for authentication tokens and sensitive data:

**Layer 1: SecureStore (Encrypted, Persistent)**
- Uses `expo-secure-store` on iOS (Keychain) and Android (Keystore)
- True persistent storage for sensitive data (auth tokens, refresh tokens)
- Encrypted at rest on device
- Survives app uninstall/reinstall (on iOS)
- Used by: Auth state, tokens, API credentials

**Layer 2: AsyncStorage (Temporary, For Hydration)**
- Regular key-value store, not encrypted
- Used ONLY for Zustand store hydration (reloading store state on app start)
- NOT used for direct token storage
- Cleared when app cache is cleared
- Used by: Store state snapshots, user preferences, UI state

### Correct Pattern

```typescript
// GOOD: Auth store using both layers correctly
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthStore {
  token: string | null;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const authStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      setToken: async (token) => {
        // 1. Store in SecureStore (actual persistent storage)
        await SecureStore.setItemAsync('auth_token', token);
        // 2. Update Zustand state
        set({ token });
      },
      logout: async () => {
        // Remove from both
        await SecureStore.deleteItemAsync('auth_token');
        set({ token: null });
      },
    }),
    {
      name: 'auth-store',
      storage: AsyncStorage, // For hydration ONLY
      version: 1,
    }
  )
);
```

### What NOT to Do

```typescript
// WRONG: Storing tokens only in AsyncStorage
const token = await AsyncStorage.getItem('auth_token'); // ❌

// WRONG: Storing tokens in plain variables
let authToken = null; // ❌ Lost on app restart

// WRONG: Assuming AsyncStorage is encrypted
await AsyncStorage.setItem('secret', password); // ❌
```

### Best Practice Summary

| Data Type | Storage | Why |
|-----------|---------|-----|
| Auth tokens | SecureStore | Encrypted at rest |
| Refresh tokens | SecureStore | Encrypted at rest |
| User preferences | AsyncStorage | Non-sensitive, faster |
| UI state | AsyncStorage | Non-sensitive, temporary |
| API keys | SecureStore | NEVER in client code |
| Session ID | SecureStore | Critical for auth |

---

## References

- **Anti-Patterns:** [ANTI_PATTERNS.md](ANTI_PATTERNS.md)
- **Security:** [SECURITY.md](SECURITY.md)
- **Health Feature:** [../features/health-metrics.md](../features/health-metrics.md)
- **Patterns:** [architecture/PATTERNS.md](../architecture/PATTERNS.md)
