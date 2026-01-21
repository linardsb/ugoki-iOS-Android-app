# Feature: AI Coach

Conversational AI assistant with access to user data, streaming responses, conversation persistence, and safety filtering.

---

## Overview

The AI Coach is a Pydantic AI-powered conversational assistant that provides personalized guidance based on user data. It supports **streaming responses**, **conversation persistence**, **web search**, and **document retrieval (RAG)**. It has access to fasting status, workout history, metrics, and biomarkers through tool calls. All responses are filtered for safety to avoid medical advice.

### Key Features (v2.1 - Jan 2026)

- **LLM Integration**: Real LLM responses in `/chat` endpoint with pattern-matching fallback
- **Streaming Responses**: Real-time text streaming via Server-Sent Events (SSE)
- **Conversation Persistence**: Messages stored in database with session management
- **Web Search**: Brave Search API for current fitness/nutrition information
- **Document RAG**: pgvector-powered semantic search over knowledge base
- **Embedding Cache**: In-memory TTL cache for embedding queries (~100x speedup on cache hit)
- **GDPR Compliance**: Export and delete conversation data
- **Multiple LLM Providers**: OpenAI, Ollama, Groq, Anthropic support

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete (v2.1) |
| Mobile | Complete (v2.1) |
| Streaming | Complete |
| Conversations | Complete |
| RAG | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to chat with an AI coach so that I get personalized guidance
- As a user, I want the coach to know my fasting status so that it can give relevant advice
- As a user, I want the coach to understand my biomarkers so that it can make informed suggestions
- As a user, I want to be redirected appropriately if I ask about medical conditions

---

## API Endpoints

### Chat Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/coach/chat` | Send message (non-streaming) | Yes |
| POST | `/api/v1/coach/stream` | **Stream message (SSE)** | Yes |
| GET | `/api/v1/coach/insights` | Get daily insights | Yes |
| GET | `/api/v1/coach/motivation` | Get motivation message | Yes |
| PUT | `/api/v1/coach/personality` | Set coach personality | Yes |

### Conversation Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/coach/conversations` | List conversations | Yes |
| GET | `/api/v1/coach/conversations/{id}/messages` | Get conversation messages | Yes |
| PATCH | `/api/v1/coach/conversations/{id}` | Update conversation (title, archive) | Yes |
| DELETE | `/api/v1/coach/conversations/{id}` | Delete conversation (GDPR) | Yes |
| GET | `/api/v1/coach/export` | Export all coach data (GDPR) | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/ai_coach/agents/coach.py` | Pydantic AI agent with streaming |
| `apps/api/src/modules/ai_coach/agents/deps.py` | Agent dependencies (UgokiAgentDeps) |
| `apps/api/src/modules/ai_coach/agents/prompt.py` | Wellness-focused system prompt |
| `apps/api/src/modules/ai_coach/agents/clients.py` | LLM/embedding client config |
| `apps/api/src/modules/ai_coach/service.py` | Chat orchestration + conversations |
| `apps/api/src/modules/ai_coach/safety.py` | Content filtering |
| `apps/api/src/modules/ai_coach/tools/web_search.py` | Brave Search integration |
| `apps/api/src/modules/ai_coach/tools/documents.py` | RAG document retrieval |
| `apps/api/src/modules/ai_coach/tools/fitness_tools.py` | User data tools |
| `apps/api/src/modules/ai_coach/orm.py` | Database models |
| `apps/api/src/modules/ai_coach/routes.py` | API endpoints |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/coach/hooks/useStreamMessage.ts` | **SSE streaming hook** |
| `apps/mobile/features/coach/hooks/useSendMessage.ts` | Non-streaming message |
| `apps/mobile/features/coach/stores/chatStore.ts` | Conversation state (Zustand) |
| `apps/mobile/features/coach/components/ChatMessage.tsx` | Message bubble |
| `apps/mobile/features/coach/components/ChatInput.tsx` | Message input |
| `apps/mobile/app/(tabs)/coach.tsx` | Chat screen |

---

## Architecture

```
User Message
     │
     ▼
┌─────────────┐
│Safety Filter│ → Block medical/emergency
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Pydantic AI │
│    Agent    │
└──────┬──────┘
       │
       ├──▶ get_active_fast() → TIME_KEEPER
       ├──▶ get_user_metrics() → METRICS
       ├──▶ get_biomarkers() → METRICS
       ├──▶ get_workout_history() → CONTENT
       └──▶ get_user_goals() → PROFILE
       │
       ▼
┌─────────────┐
│Claude 3.5   │
│   Sonnet    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Response     │
│Filter       │ → Add disclaimers
└──────┬──────┘
       │
       ▼
   Response
```

---

## Agent Tools

### User Data Tools (fitness_tools.py)

| Tool | Description | Module |
|------|-------------|--------|
| `get_active_fast` | Current fasting status | TIME_KEEPER |
| `get_fasting_history` | Recent fasts | TIME_KEEPER |
| `get_user_metrics` | Weight, etc. | METRICS |
| `get_latest_biomarkers` | Blood test results | METRICS |
| `get_biomarker_trend` | Biomarker history | METRICS |
| `get_workout_history` | Recent workouts | CONTENT |
| `get_user_goals` | User's goals | PROFILE |
| `get_streak_info` | Current streaks | PROGRESSION |

### External Tools (v2.0)

| Tool | Description | Source |
|------|-------------|--------|
| `web_search` | Search web for fitness/nutrition info | Brave Search API |
| `retrieve_relevant_documents` | RAG semantic search | pgvector/OpenAI embeddings |
| `list_documents` | List knowledge base docs | Internal DB |
| `get_document_content` | Get full document | Internal DB |

---

## Safety Filtering

### Blocked Topics

Pre-filter blocks these topics:
- Medical conditions (diabetes, heart disease, cancer)
- Eating disorders (anorexia, bulimia)
- Medications (drug interactions, prescriptions)
- Allergies (food allergies, anaphylaxis)

### Emergency Redirect

Keywords trigger emergency response:
- "chest pain" → "Call 911 immediately"
- "can't breathe" → "Call 911 immediately"
- "heart attack" → "Call 911 immediately"

### Safe Topics

Coach can discuss:
- Fasting schedules and protocols
- Workout guidance and technique
- Motivation and habit building
- General wellness tips
- Biomarker interpretation (general)

---

## Data Models

### Streaming Request (v2.1)

```typescript
interface StreamChatRequest {
  message: string;       // User's message (consistent with /chat endpoint)
  session_id?: string;   // null = new conversation
  personality?: "motivational" | "calm" | "tough" | "friendly";
}
```

### Stream Chunk (SSE Response)

```typescript
interface StreamChunk {
  text: string;
  session_id?: string;  // first chunk of new conversation
  conversation_title?: string;
  complete: boolean;
  error?: string;
}
```

### Conversation Session

```typescript
interface ConversationSession {
  session_id: string;
  identity_id: string;
  title: string | null;
  created_at: string;
  last_message_at: string;
  is_archived: boolean;
  message_count: number;
}
```

### Conversation Message

```typescript
interface ConversationMessage {
  id: number;
  session_id: string;
  message_type: "human" | "ai";
  content: string;
  created_at: string;
  files?: string[];
}
```

### Legacy Chat Request

```typescript
interface ChatRequest {
  message: string;
  personality?: "motivational" | "calm" | "tough" | "friendly";
}
```

### Legacy Chat Response

```typescript
interface ChatResponse {
  response: {
    message: string;
    suggestions: string[];
    encouragement?: string;
  };
  quick_actions: QuickAction[];
  safety_redirected: boolean;
}
```

---

## Rate Limiting

| Tier | Limit |
|------|-------|
| Free | 10 messages/day |
| Premium | 50 messages/day |

---

## Cost Considerations

| Model | Cost | Usage |
|-------|------|-------|
| Claude 3.5 Sonnet | ~$3/1M tokens | Complex coaching |
| Claude 3 Haiku | ~$0.25/1M tokens | Simple queries |

Model selection based on query complexity (future enhancement).

---

## Known Issues

None currently tracked.

---

## Database Schema (v2.1)

### coach_conversations

| Column | Type | Description |
|--------|------|-------------|
| session_id | VARCHAR(100) | Primary key, format: `{identity_id}~{random}` |
| identity_id | VARCHAR(36) | FK to identities, CASCADE DELETE |
| title | VARCHAR(255) | Conversation title (auto-generated) |
| last_message_at | TIMESTAMPTZ | Last activity |
| is_archived | BOOLEAN | Archive flag |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Created timestamp |

### coach_messages

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| session_id | VARCHAR(100) | FK to conversations, CASCADE DELETE |
| message | JSONB | {type, content, files?} |
| message_data | TEXT | Pydantic AI format for history |
| created_at | TIMESTAMPTZ | Message timestamp |

### coach_documents (RAG - v2.1)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| content | TEXT | Document chunk text |
| metadata | JSONB | Source file, chunk index, title |
| embedding | VECTOR(1536) | OpenAI text-embedding-3-small |
| identity_id | VARCHAR(36) | FK to identities (null = global doc) |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

**Indexes:**
- `idx_coach_docs_embedding_hnsw` - HNSW index for fast cosine similarity
- `idx_coach_docs_identity` - B-tree index on identity_id

### coach_requests

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key |
| identity_id | VARCHAR(36) | FK to identities |
| user_query | TEXT | Query for rate limiting |
| timestamp | TIMESTAMPTZ | Request time |

---

## Performance Optimizations (v2.1)

### Embedding Cache

The RAG system includes an in-memory embedding cache to reduce API latency:

| Setting | Value | Description |
|---------|-------|-------------|
| Max Size | 1000 entries | LRU eviction when exceeded |
| TTL | 1 hour | Entries expire after 1 hour |
| Key | SHA256 hash | Normalized (lowercase, trimmed) text |

**Performance Impact:**

| Scenario | Embedding Time | Total RAG Time |
|----------|---------------|----------------|
| Cache miss | ~50-150ms | ~55-170ms |
| Cache hit | ~0.1ms | ~5-15ms |

**Utility Functions:**

```python
from src.modules.ai_coach.tools.documents import (
    get_embedding_cache_stats,  # Get cache statistics
    clear_embedding_cache,      # Clear cache (returns count)
)
```

### Vector Search

- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Distance Metric**: Cosine similarity (`<=>` operator)
- **Default Results**: 4 chunks per query

---

## Configuration (v2.1)

Environment variables for LLM and embeddings:

```env
# LLM Provider (openai, ollama, groq, anthropic)
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_CHOICE=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1

# Embeddings (for RAG)
EMBEDDING_PROVIDER=openai
EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL_CHOICE=text-embedding-3-small

# Web Search (optional)
BRAVE_API_KEY=...
```

---

## Document Ingestion (v2.1)

CLI script for ingesting documents into the RAG knowledge base:

```bash
# Ingest all docs from a directory
uv run python scripts/ingest_documents.py --source ../docs/guides

# Clear existing and re-ingest
uv run python scripts/ingest_documents.py --source ../docs --clear

# Custom chunk size
uv run python scripts/ingest_documents.py --source ../docs --chunk-size 500 --overlap 100

# Verify ingestion
uv run python scripts/ingest_documents.py --source ../docs --verify
```

**Supported File Types:** `.md`, `.txt`, `.py`, `.rst`, `.json`

---

## Future Enhancements

- [x] ~~Conversation memory across sessions~~ (v2.0)
- [x] ~~Streaming responses~~ (v2.0)
- [x] ~~Web search integration~~ (v2.0)
- [x] ~~RAG document retrieval~~ (v2.1)
- [x] ~~LLM in /chat endpoint~~ (v2.1)
- [x] ~~Embedding cache~~ (v2.1)
- [ ] Model routing (Haiku for simple, Sonnet for complex)
- [ ] Proactive insights push notifications
- [ ] Voice input/output
- [ ] Mem0 integration for long-term memory
- [ ] Meal suggestions based on eating window
- [ ] Redis-based embedding cache for multi-worker deployments

---

## References

- **PRD Section:** [PRD.md#ai-coach](../product/PRD.md#33-ai-coach)
- **Module Spec:** [MODULES.md#ai_coach](../architecture/MODULES.md#6-ai_coach-module)
- **Security:** [SECURITY.md#ai-safety](../standards/SECURITY.md#ai-safety)
