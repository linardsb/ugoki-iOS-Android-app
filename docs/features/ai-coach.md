# Feature: AI Coach

Conversational AI assistant with access to user data and safety filtering.

---

## Overview

The AI Coach is a Claude-powered conversational assistant that provides personalized guidance based on user data. It has access to fasting status, workout history, metrics, and biomarkers through tool calls. All responses are filtered for safety to avoid medical advice.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to chat with an AI coach so that I get personalized guidance
- As a user, I want the coach to know my fasting status so that it can give relevant advice
- As a user, I want the coach to understand my biomarkers so that it can make informed suggestions
- As a user, I want to be redirected appropriately if I ask about medical conditions

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/coach/chat` | Send message to coach | Yes |
| GET | `/api/v1/coach/history` | Get chat history | Yes |
| GET | `/api/v1/coach/insights` | Get daily insights | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/ai_coach/agent.py` | Pydantic AI agent definition |
| `apps/api/src/modules/ai_coach/service.py` | Chat orchestration |
| `apps/api/src/modules/ai_coach/safety.py` | Content filtering |
| `apps/api/src/modules/ai_coach/tools/` | Agent tools |
| `apps/api/src/modules/ai_coach/routes.py` | API endpoints |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/coach/hooks/useCoach.ts` | React Query hooks |
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

### Chat Request

```typescript
interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}
```

### Chat Response

```typescript
interface ChatResponse {
  message: string;
  tools_used: string[];
  disclaimer?: string;
}
```

### Chat Message

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tools_used?: string[];
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

## Future Enhancements

- [ ] Model routing (Haiku for simple, Sonnet for complex)
- [ ] Proactive insights push notifications
- [ ] Voice input/output
- [ ] Conversation memory across sessions
- [ ] Meal suggestions based on eating window

---

## References

- **PRD Section:** [PRD.md#ai-coach](../product/PRD.md#33-ai-coach)
- **Module Spec:** [MODULES.md#ai_coach](../architecture/MODULES.md#6-ai_coach-module)
- **Security:** [SECURITY.md#ai-safety](../standards/SECURITY.md#ai-safety)
