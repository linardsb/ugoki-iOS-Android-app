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

## References

- **Anti-Patterns:** [ANTI_PATTERNS.md](ANTI_PATTERNS.md)
- **Security:** [SECURITY.md](SECURITY.md)
- **Patterns:** [architecture/PATTERNS.md](../architecture/PATTERNS.md)
