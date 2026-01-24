# UGOKI Code Patterns & Conventions

Standard patterns used throughout the codebase.

---

## Backend Patterns

### Module Interface Pattern

Every module exposes an abstract interface:

```python
# module/interface.py
from abc import ABC, abstractmethod

class TimeKeeperInterface(ABC):
    @abstractmethod
    async def open_window(self, identity_id: str, window_type: str, ...) -> TimeWindow:
        """Open a new time window."""
        pass

    @abstractmethod
    async def close_window(self, window_id: str, end_state: str) -> TimeWindow:
        """Close an active window."""
        pass
```

**Why:** Enables testing with mocks, future implementation swaps.

---

### Service Implementation Pattern

```python
# module/service.py
from .interface import TimeKeeperInterface
from .orm import TimeWindowORM
from .models import TimeWindow

class TimeKeeperService(TimeKeeperInterface):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def open_window(self, identity_id: str, window_type: str, ...) -> TimeWindow:
        orm = TimeWindowORM(
            identity_id=identity_id,
            window_type=window_type,
            ...
        )
        self.db.add(orm)
        await self.db.commit()
        return self._to_model(orm)

    def _to_model(self, orm: TimeWindowORM) -> TimeWindow:
        return TimeWindow(
            id=str(orm.id),
            ...
        )
```

**Why:** Separates database concerns from business logic.

---

### Route Handler Pattern

```python
# module/routes.py
from fastapi import APIRouter, Depends
from .service import TimeKeeperService
from .models import StartFastRequest, TimeWindowResponse

router = APIRouter(prefix="/fasting", tags=["fasting"])

@router.post("/start", response_model=TimeWindowResponse)
async def start_fast(
    request: StartFastRequest,
    identity_id: str = Depends(get_current_identity),
    service: TimeKeeperService = Depends(get_time_keeper_service)
):
    window = await service.open_window(
        identity_id=identity_id,
        window_type="fast",
        ...
    )
    return TimeWindowResponse.from_model(window)
```

**Why:** Clear separation of HTTP concerns from business logic.

---

### Pydantic Model Pattern

```python
# module/models.py
from pydantic import BaseModel
from datetime import datetime

class TimeWindowBase(BaseModel):
    window_type: str
    start_time: datetime

class TimeWindowCreate(TimeWindowBase):
    pass

class TimeWindowResponse(TimeWindowBase):
    id: str
    state: str
    end_time: datetime | None

    class Config:
        from_attributes = True
```

**Why:** Request/response validation, automatic OpenAPI docs.

---

### SQLAlchemy ORM Pattern

```python
# module/orm.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base
import uuid

class TimeWindowORM(Base):
    __tablename__ = "time_windows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    window_type = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    state = Column(String, nullable=False, default="active")
```

**Why:** Type-safe database operations, migration support.

---

### Dependency Injection Pattern

```python
# src/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session

def get_time_keeper_service(db: AsyncSession = Depends(get_db)):
    return TimeKeeperService(db)
```

**Why:** Testability, clean resource management.

---

## Mobile Patterns

### Feature Module Pattern

```
features/{name}/
├── index.ts              # Re-exports
├── types.ts              # TypeScript types
├── hooks/
│   ├── index.ts          # Re-exports
│   └── use{Action}.ts    # React Query hooks
├── components/           # Feature components
└── stores/               # Zustand stores (if needed)
```

**Why:** Colocated code, clear boundaries, easy navigation.

---

### React Query Hook Pattern

```typescript
// features/fasting/hooks/useFasting.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';

export function useActiveFast() {
  return useQuery({
    queryKey: queryKeys.fasting.active,
    queryFn: () => api.get('/fasting/active').then(r => r.data),
  });
}

export function useStartFast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartFastRequest) =>
      api.post('/fasting/start', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fasting.active });
    },
  });
}
```

**Why:** Consistent data fetching, automatic caching, optimistic updates.

---

### Zustand Store Pattern

```typescript
// features/fasting/stores/fastingStore.ts
import { create } from 'zustand';

interface FastingState {
  isRunning: boolean;
  startTime: Date | null;
  pausedDuration: number;
  actions: {
    start: (startTime: Date) => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
  };
}

export const useFastingStore = create<FastingState>((set) => ({
  isRunning: false,
  startTime: null,
  pausedDuration: 0,
  actions: {
    start: (startTime) => set({ isRunning: true, startTime }),
    pause: () => set({ isRunning: false }),
    resume: () => set({ isRunning: true }),
    reset: () => set({ isRunning: false, startTime: null, pausedDuration: 0 }),
  },
}));
```

**Why:** Simple state management, no boilerplate.

---

### Zustand Persist Pattern (with Error Recovery)

When persisting state that syncs with server, **always handle stale state scenarios**:

```typescript
// features/coach/stores/chatStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/shared/stores/storage';

interface ChatState {
  // Server-synced state (can become stale)
  currentSessionId: string | null;
  messages: ChatMessage[];

  // Local-only state (safe to persist)
  personality: CoachPersonality;

  // Actions
  clearMessages: () => void;
  startNewConversation: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      messages: [],
      personality: 'motivational',

      // IMPORTANT: Clear server-synced IDs when clearing local state
      clearMessages: () => {
        set({
          currentSessionId: null,  // Must reset server reference
          messages: [],
        });
      },

      // Explicit action to reset server-synced state
      startNewConversation: () => {
        set({
          currentSessionId: null,
          messages: [],
        });
      },
    }),
    {
      name: 'coach-chat-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist what's safe - consider if server IDs should be persisted
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,  // ⚠️ Can become stale
        messages: state.messages.slice(-50),
        personality: state.personality,  // ✅ Local-only, always safe
      }),
    }
  )
);
```

**Key Rules:**
1. **Server IDs can become stale** - Sessions expire, entities get deleted
2. **Clear IDs when clearing related state** - If messages are cleared, session ID must be cleared too
3. **Provide explicit reset actions** - `startNewConversation()` to cleanly reset server-synced state
4. **Consider NOT persisting server IDs** - Only persist if truly needed for UX

**Why:** Persisted client state can diverge from server state. Must handle gracefully.

---

### Client-Server State Sync Pattern

When client state references server entities, implement error recovery:

```typescript
// features/coach/hooks/useStreamMessage.ts
const hasRetriedRef = useRef<boolean>(false);

const sendMessage = useCallback(async (message: string) => {
  // ... send request with currentSessionId ...

  es.addEventListener('message', (event) => {
    const chunk = JSON.parse(event.data);

    // Handle stale reference error with auto-recovery
    if (chunk.error === 'conversation_not_found' && !hasRetriedRef.current) {
      console.log('[Coach] Stale session, clearing and retrying...');
      hasRetriedRef.current = true;
      startNewConversation();  // Clear stale ID

      // Retry once without the stale ID
      setTimeout(() => sendMessage(message), 100);
      return;
    }

    // Handle other errors normally
    if (chunk.error) {
      options?.onError?.(chunk.error);
      return;
    }

    // On success, reset retry flag
    if (chunk.complete) {
      hasRetriedRef.current = false;
    }
  });
}, [currentSessionId, startNewConversation]);
```

**Key Rules:**
1. **Detect stale reference errors** - `not_found`, `expired`, `invalid_session`
2. **Clear stale state** - Remove the invalid reference
3. **Retry once** - Use a flag to prevent infinite loops
4. **Reset on success** - Clear retry flag when operation succeeds

**Why:** Server state can change independently. Client must recover gracefully.

---

### Stale Cache Recovery Strategies

| Scenario | Strategy |
|----------|----------|
| Session expired | Clear session ID, retry creates new session |
| Entity deleted | Clear reference, show "not found" or redirect |
| Token expired | Refresh token, retry request |
| Data out of sync | Invalidate React Query cache, refetch |

**Implementation Priority:**
1. **Critical paths first** - Auth, active features (fasting, workouts, coach)
2. **Add error boundaries** - Catch unhandled errors gracefully
3. **Log for debugging** - `console.log('[Feature] Stale state recovered')`

---

### Theme-Aware Component Pattern

```typescript
// Detect effective theme
const colorScheme = useColorScheme();
const { mode: themeMode } = useThemeStore();
const systemTheme = colorScheme || 'light';
const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
const isDark = effectiveTheme === 'dark';

// Apply theme-aware colors
const cardBackground = isDark ? '#1c1c1e' : 'white';
const textColor = isDark ? '#ffffff' : '#1f2937';
```

**Why:** Consistent dark mode support across app.

---

### Screen Layout Pattern

```typescript
// app/(tabs)/dashboard.tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, YStack, Text } from 'tamagui';
import { ScreenHeader } from '@/shared/components/ui';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="Dashboard" />
      <ScrollView>
        <YStack padding="$4" gap="$4">
          {/* Content */}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Why:** Consistent layout, safe area handling, scroll support.

---

## Database Conventions

### Table Naming
- Snake_case, plural: `fasting_sessions`, `user_profiles`
- Module-prefixed where ambiguous: `research_papers`

### Column Naming
- Snake_case: `created_at`, `identity_id`
- Foreign keys: `{referenced_table}_id`
- Timestamps: `created_at`, `updated_at`, `started_at`, `ended_at`
- Always use `DateTime(timezone=True)` for timestamps

### IDs
- UUID for all primary keys
- Opaque to other modules (treat as strings)

---

## API Conventions

### Endpoints
```
GET    /api/v1/{module}/{resource}         # List
POST   /api/v1/{module}/{resource}         # Create
GET    /api/v1/{module}/{resource}/{id}    # Read
PATCH  /api/v1/{module}/{resource}/{id}    # Update
DELETE /api/v1/{module}/{resource}/{id}    # Delete
```

### Response Format
```json
{
  "data": { ... },
  "meta": { "timestamp": "...", "request_id": "..." }
}
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

---

## Testing Patterns

### Unit Test Pattern (Backend)
```python
@pytest.mark.asyncio
async def test_open_window():
    # Arrange
    mock_db = AsyncMock()
    service = TimeKeeperService(mock_db)

    # Act
    result = await service.open_window(
        identity_id="test-id",
        window_type="fast"
    )

    # Assert
    assert result.state == "active"
    mock_db.add.assert_called_once()
```

### Component Test Pattern (Mobile)
```typescript
import { render, screen } from '@testing-library/react-native';
import { FastingTimer } from './FastingTimer';

test('displays elapsed time', () => {
  render(<FastingTimer startTime={new Date()} />);
  expect(screen.getByText(/00:00/)).toBeTruthy();
});
```

---

## References

- **Modules:** [MODULES.md](MODULES.md)
- **Standards:** [standards/CODING_STANDARDS.md](../standards/CODING_STANDARDS.md)
