# UGOKI AI Coach Integration Plan

**Status**: ✅ IMPLEMENTED
**Created**: 2026-01-20
**Implemented**: 2026-01-20

> This plan has been fully implemented. See `docs/features/ai-coach.md` for the updated feature documentation.

## Overview

Integrate Pydantic AI Agent capabilities into UGOKI while preserving its GDPR-compliant user system.

**Source Directories:**
| Project | Path |
|---------|------|
| UGOKI | `/Users/Berzins/Desktop/AI/UGOKI/ugoki_1_0` |
| Agent Application | `/Users/Berzins/Desktop/AI/AI_Agent_Mastery_Course/ai-agent-mastery/5_Agent_Application` |
| Pydantic AI Agent | `/Users/Berzins/Desktop/AI/AI_Agent_Mastery_Course/ai-agent-mastery/4_Pydantic_AI_Agent` |

---

## Key Decisions

| Aspect | Approach |
|--------|----------|
| Auth System | Keep UGOKI's JWT + `identity_id` (NOT Supabase) |
| Database | Add tables via Alembic migrations (NOT Supabase RLS) |
| PII Isolation | Maintain UGOKI's GDPR-compliant separation |
| Admin Features | Skip (per user request) |
| **Build Location** | **Directly in UGOKI** - copy agent code from `4_Pydantic_AI_Agent`, skip `5_Agent_Application` |

### Why Build Directly in UGOKI?

- **5_Agent_Application uses Supabase** with different auth patterns (auth.users, RLS policies)
- **UGOKI has its own JWT + identity_id** system that's production-ready with GDPR compliance
- **Copying from 4_Pydantic_AI_Agent** gives you the agent functionality without Supabase dependencies
- **No porting needed** - code adapts once to UGOKI's patterns

---

## Phase 1: Database Schema

### New Alembic Migration

**File:** `apps/api/alembic/versions/xxxx_add_coach_conversations.py`

```sql
-- coach_conversations: stores conversation sessions
CREATE TABLE coach_conversations (
    session_id VARCHAR(100) PRIMARY KEY,  -- format: {identity_id}~{random_10_chars}
    identity_id VARCHAR(36) NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    title VARCHAR(255),
    last_message_at TIMESTAMPTZ NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_coach_conv_identity ON coach_conversations(identity_id);

-- coach_messages: stores individual messages
CREATE TABLE coach_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES coach_conversations(session_id) ON DELETE CASCADE,
    message JSONB NOT NULL,  -- {type: 'human'|'ai', content, files?}
    message_data TEXT,       -- Pydantic AI message format for history reconstruction
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_coach_msg_session ON coach_messages(session_id);

-- coach_requests: rate limiting
CREATE TABLE coach_requests (
    id VARCHAR(36) PRIMARY KEY,
    identity_id VARCHAR(36) NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    user_query TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_coach_req_identity ON coach_requests(identity_id);
CREATE INDEX idx_coach_req_timestamp ON coach_requests(timestamp);
```

---

## Phase 2: AI Coach Module Enhancement

### File Structure

```
apps/api/src/modules/ai_coach/
├── interface.py      # ADD: streaming + conversation methods
├── models.py         # ADD: ConversationSession, ConversationMessage, StreamChunk
├── orm.py            # NEW: SQLAlchemy ORM models
├── routes.py         # ADD: /stream, /conversations endpoints
├── service.py        # UPDATE: integrate Pydantic AI agent
├── safety.py         # KEEP: existing safety filters
├── agents/           # NEW directory
│   ├── __init__.py
│   ├── coach.py      # Pydantic AI agent setup
│   ├── deps.py       # UgokiAgentDeps dataclass
│   └── prompt.py     # Wellness-focused system prompt
└── tools/            # NEW directory
    ├── __init__.py
    ├── web_search.py     # Brave API search
    └── documents.py      # RAG retrieval tools
```

### Key Models to Add

```python
# models.py additions
class ConversationSession(BaseModel):
    session_id: str
    identity_id: str
    title: str | None
    created_at: datetime
    last_message_at: datetime
    is_archived: bool = False

class ConversationMessage(BaseModel):
    id: int
    session_id: str
    message_type: Literal["human", "ai"]
    content: str
    created_at: datetime

class StreamChatRequest(BaseModel):
    query: str
    session_id: str | None = None  # None = new conversation

class StreamChunk(BaseModel):
    text: str
    session_id: str | None = None
    conversation_title: str | None = None
    complete: bool = False
```

---

## Phase 3: Agent Integration

### Agent Dependencies (adapted for UGOKI)

```python
# agents/deps.py
@dataclass
class UgokiAgentDeps:
    db: AsyncSession
    identity_id: str
    embedding_client: AsyncOpenAI
    http_client: AsyncClient
    brave_api_key: str | None = None
    memories: str = ""        # From Mem0
    user_context: str = ""    # Fitness level, goals, health conditions
```

### Copy/Adapt from Reference

| Source File | Target Location | Changes |
|-------------|-----------------|---------|
| `4_Pydantic_AI_Agent/agent.py` | `ai_coach/agents/coach.py` | Use UgokiAgentDeps |
| `4_Pydantic_AI_Agent/clients.py` | `ai_coach/agents/clients.py` | Use UGOKI config |
| `4_Pydantic_AI_Agent/prompt.py` | `ai_coach/agents/prompt.py` | Wellness-focused prompt |
| `4_Pydantic_AI_Agent/tools.py` | `ai_coach/tools/` | Selected tools only |

---

## Phase 4: API Endpoints

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/coach/stream` | Stream chat with AI agent |
| GET | `/api/v1/coach/conversations` | List user's conversations |
| GET | `/api/v1/coach/conversations/{id}/messages` | Get conversation messages |
| DELETE | `/api/v1/coach/conversations/{id}` | Delete conversation (GDPR) |
| GET | `/api/v1/coach/export` | Export all coach data (GDPR) |

### Streaming Response Format

```json
{"text": "partial response..."}
{"text": "more text...", "session_id": "uuid~abc123", "conversation_title": "Weight loss question", "complete": true}
```

---

## Phase 5: GDPR Compliance

### Update Profile Service

**File:** `apps/api/src/modules/profile/service.py`

Add coach data to:
- `export_data()` - include conversations and messages
- `delete_all_data()` - cascade delete coach tables + Mem0 memories

---

## Phase 6: Mobile App Updates

### Files to Update

| File | Changes |
|------|---------|
| `apps/mobile/features/coach/stores/chatStore.ts` | Add sessionId, conversations state |
| `apps/mobile/features/coach/hooks/useSendMessage.ts` | Streaming fetch with reader |
| `apps/mobile/features/coach/screens/ChatScreen.tsx` | Conversation sidebar (optional) |

---

## Phase 7: Configuration

### New Environment Variables

```env
# apps/api/.env additions
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_CHOICE=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1

EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL_CHOICE=text-embedding-3-small

BRAVE_API_KEY=...  # For web search (optional)
```

---

## Verification Plan

1. **Database**: Run migration, verify tables created
2. **API**:
   - POST `/coach/stream` with new conversation
   - GET `/coach/conversations` returns list
   - DELETE `/coach/conversations/{id}` removes data
3. **GDPR**:
   - GET `/profile/export` includes coach data
   - Profile delete cascades to coach tables
4. **Mobile**: Test streaming in app

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Agent Tools | Web search + Document RAG (no SQL, no code execution) |
| Mem0 Memory | Yes - include for cross-session personalization |
| Existing Coach | Keep as fallback when LLM unavailable |

---

## Tools to Implement

### From `4_Pydantic_AI_Agent/tools.py`:

1. **Web Search** (`web_search`)
   - Brave Search API integration
   - Returns relevant fitness/nutrition information
   - Source: lines ~50-150 in tools.py

2. **Document Retrieval** (`retrieve_relevant_documents`)
   - Semantic search with OpenAI embeddings
   - Returns top 4 relevant chunks
   - Source: lines ~200-250 in tools.py

3. **List Documents** (`list_documents`)
   - Show available documents
   - Source: lines ~260-300 in tools.py

4. **Get Document Content** (`get_document_content`)
   - Retrieve full document by ID
   - Source: lines ~310-350 in tools.py

### NOT Including:
- `execute_sql_query` - not needed
- `run_python_code` / MCP - not needed
- `image_analysis` - not needed for MVP

---

## Fallback Strategy

When LLM unavailable (API error, rate limit, etc.):
1. Catch exception in `stream_chat()`
2. Fall back to existing pattern-matching in `service.py`
3. Return non-streaming response with safety-filtered content

---

## Implementation Order

1. **Phase 1**: Create Alembic migration for coach tables
2. **Phase 2**: Add ORM models and update ai_coach models.py
3. **Phase 3**: Create agents/ directory with coach.py, deps.py, prompt.py
4. **Phase 4**: Create tools/ directory with web_search.py and documents.py
5. **Phase 5**: Update service.py with stream_chat() and conversation methods
6. **Phase 6**: Update routes.py with new endpoints
7. **Phase 7**: Update interface.py with new abstract methods
8. **Phase 8**: Update profile service for GDPR compliance
9. **Phase 9**: Add environment variables to config
10. **Phase 10**: Update mobile app for streaming

---

## Critical Files to Modify

| File | Action |
|------|--------|
| `apps/api/alembic/versions/xxxx_add_coach_conversations.py` | CREATE |
| `apps/api/src/modules/ai_coach/orm.py` | CREATE |
| `apps/api/src/modules/ai_coach/agents/__init__.py` | CREATE |
| `apps/api/src/modules/ai_coach/agents/coach.py` | CREATE |
| `apps/api/src/modules/ai_coach/agents/deps.py` | CREATE |
| `apps/api/src/modules/ai_coach/agents/prompt.py` | CREATE |
| `apps/api/src/modules/ai_coach/agents/clients.py` | CREATE |
| `apps/api/src/modules/ai_coach/tools/__init__.py` | CREATE |
| `apps/api/src/modules/ai_coach/tools/web_search.py` | CREATE |
| `apps/api/src/modules/ai_coach/tools/documents.py` | CREATE |
| `apps/api/src/modules/ai_coach/models.py` | MODIFY |
| `apps/api/src/modules/ai_coach/interface.py` | MODIFY |
| `apps/api/src/modules/ai_coach/service.py` | MODIFY |
| `apps/api/src/modules/ai_coach/routes.py` | MODIFY |
| `apps/api/src/modules/profile/service.py` | MODIFY |
| `apps/api/src/core/config.py` | MODIFY |
| `apps/mobile/features/coach/stores/chatStore.ts` | MODIFY |
| `apps/mobile/features/coach/hooks/useSendMessage.ts` | MODIFY |

---

## Dependencies to Add

```
# apps/api/requirements.txt additions
pydantic-ai>=0.1.1
mem0ai
httpx>=0.28.1
```

---

## User Context & Memory Implementation (2026-01-21)

### Overview

Enhanced the AI Coach to provide personalized, context-aware responses by:
1. Persisting coach personality preferences in the database
2. Building dynamic user context from fitness data
3. Loading conversation history for multi-turn awareness
4. Implementing token management with automatic summarization

### Database Changes

**Migration:** `e3f4a5b6c7d8_add_coach_user_settings.py`

```sql
-- Personality persistence
CREATE TABLE coach_user_settings (
    identity_id VARCHAR(36) PRIMARY KEY REFERENCES identities(id),
    personality VARCHAR(20) DEFAULT 'motivational',
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);

-- Conversation token management (added columns)
ALTER TABLE coach_conversations ADD COLUMN summary TEXT;
ALTER TABLE coach_conversations ADD COLUMN message_count INTEGER DEFAULT 0;
```

### Context Building

The AI Coach now receives three types of context in every request:

1. **User Context** (`_build_user_context`)
   - Level, XP, and progression
   - Active streaks (fasting, workout, logging)
   - Current fast status (if active)
   - Workout statistics
   - Weight trend (30-day)

2. **User Preferences** (`_build_user_preferences_context`)
   - Primary goal & target weight
   - Weekly workout goals
   - Fasting targets & default protocol
   - Fitness level & injury areas
   - Dietary preferences & allergies

3. **Health Context** (`_build_health_context`)
   - Fasting safety warnings
   - Medical conditions requiring caution
   - Medication considerations

### Conversation History

- Loads last 50 messages for existing conversations
- Converts to Pydantic AI `ModelMessage` format
- Passes via `message_history` parameter to agent
- Enables multi-turn awareness ("what did we discuss earlier?")

### Token Management

| Constant | Value | Purpose |
|----------|-------|---------|
| `CHARS_PER_TOKEN` | 4 | Token estimation |
| `MAX_HISTORY_TOKENS` | 80,000 | History budget (of 128K context) |
| `SUMMARIZE_AFTER_MESSAGES` | 30 | Trigger summarization |

When conversations exceed 30 messages:
1. LLM generates 2-3 sentence summary
2. Summary stored in `coach_conversations.summary`
3. Future loads prepend summary before recent messages

### Files Changed

| File | Changes |
|------|---------|
| `orm.py` | Added `CoachUserSettingsORM`, updated `CoachConversationORM` |
| `service.py` | Added context builders, history loading, token management |
| `agents/coach.py` | Added `message_history` parameter to streaming functions |
| `alembic/versions/e3f4a5b6c7d8_...` | New migration |

### Verification

1. **Personality persistence:** Set via API → restart server → verify persists
2. **User context:** Ask "what level am I?" → coach knows without calling tools
3. **Conversation history:** Send multiple messages → coach references earlier discussion
4. **Summarization:** After 30+ messages, summary is generated and stored
