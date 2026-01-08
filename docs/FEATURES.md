# UGOKI Feature Documentation

Detailed documentation for major features in UGOKI.

---

## Research Hub Feature

Users can browse and search scientific research on health topics (Intermittent Fasting, HIIT, Nutrition, Sleep). Papers are fetched from PubMed and summarized by AI (Claude Haiku) into bite-sized, actionable insights.

### Topics

| Topic | Description | Color |
|-------|-------------|-------|
| `intermittent_fasting` | Time-restricted eating and metabolic benefits | Teal (#14b8a6) |
| `hiit` | High-intensity interval training and workout optimization | Orange (#f97316) |
| `nutrition` | Diet, macronutrients, and their effects on health | Green (#22c55e) |
| `sleep` | Sleep quality, recovery, and circadian rhythm | Purple (#8b5cf6) |

### API Endpoints

```
GET  /api/v1/research/topics                    # List all topics with metadata
GET  /api/v1/research/topics/{topic}            # Get papers for a topic (no quota)
GET  /api/v1/research/search                    # Search papers (counts against quota)
GET  /api/v1/research/papers/{id}               # Get single paper details
GET  /api/v1/research/saved                     # User's saved papers
POST /api/v1/research/saved                     # Save a paper
DELETE /api/v1/research/saved/{id}              # Unsave a paper
GET  /api/v1/research/quota                     # Check remaining searches
```

### AI-Generated Digest

Each paper is summarized by Claude Haiku into a `ResearchDigest`:
- **one_liner**: Single sentence summary of the key finding
- **key_benefits**: Array of {emoji, title, description} takeaways
- **audience_tags**: Array of who benefits (e.g., "Athletes", "Beginners")
- **tldr**: 2-3 sentence summary for quick understanding

### Key Files (Backend)

```
src/modules/research/
├── __init__.py                    # Module exports
├── models.py                      # Pydantic models (ResearchPaper, ResearchDigest, etc.)
├── interface.py                   # Abstract interface (8 methods)
├── orm.py                         # SQLAlchemy models (ResearchPaperORM, etc.)
├── service.py                     # Business logic with caching
├── routes.py                      # FastAPI endpoints
├── sources/
│   ├── base.py                    # Abstract adapter interface
│   └── pubmed.py                  # PubMed E-utilities API adapter
└── ai/
    └── summarizer.py              # Claude Haiku summarizer
```

### Key Files (Mobile)

```
features/research/
├── types.ts                       # TypeScript types matching backend
├── hooks/useResearch.ts           # React Query hooks (8 hooks)
├── components/
│   ├── TopicPill.tsx              # Topic selection button
│   ├── ResearchCard.tsx           # Paper card with digest
│   ├── BenefitBadge.tsx           # Key benefit display
│   ├── QuotaIndicator.tsx         # Search quota remaining
│   └── ExternalLinkWarning.tsx    # "Leaving app" alert
└── index.ts                       # Re-exports

app/(modals)/research/
├── index.tsx                      # Main research hub screen
├── [id].tsx                       # Paper detail screen
└── saved.tsx                      # Saved papers screen
```

### Quota System

- 15 searches per user per day
- Topic browsing does NOT count against quota
- Quota resets at midnight UTC
- Tracked in `user_search_quotas` table

### PubMed Integration

Uses NCBI E-utilities API (free, no key required for <3 req/sec):
1. **ESearch** - Get list of PMIDs matching query
2. **EFetch** - Fetch paper details (title, authors, abstract, journal, date)

Papers are cached in `research_papers` table to minimize API calls.

---

## Bloodwork Feature

Users can upload blood test results (PDF or image) during onboarding or at any time. The system parses biomarkers using Claude's vision capabilities and stores them in METRICS for AI coach analysis. Users can view their complete bloodwork history, track individual biomarkers over time, and see trends.

### Endpoints

```
POST /api/v1/uploads/bloodwork                     # Upload PDF/JPG/PNG blood test
GET  /api/v1/uploads/bloodwork/supported-formats   # Get supported file types
GET  /api/v1/metrics/biomarkers/grouped            # All tests grouped by date
GET  /api/v1/metrics/by-prefix?prefix=biomarker_   # Query all biomarkers
GET  /api/v1/metrics/history?metric_type=X         # Historical values for a biomarker
GET  /api/v1/metrics/trend?metric_type=X           # Trend analysis (up/down/stable)
PUT  /api/v1/metrics/{id}                          # Update a biomarker
DELETE /api/v1/metrics/{id}                        # Delete a biomarker
POST /api/v1/metrics                               # Add biomarker manually
```

### How It Works

1. **Upload** - User uploads PDF or image of blood test results
2. **Extract** - `pdfplumber` extracts text from PDFs, Claude Vision for images
3. **Parse** - Claude parses biomarkers into structured format with:
   - Standardized name (e.g., "haemoglobin", "cholesterol")
   - Value, unit, reference range (low/high)
   - Flag (low/normal/high/abnormal)
4. **Store** - Saved in METRICS table with `biomarker_` prefix
5. **Analyze** - AI Coach tools query biomarkers for personalized insights

### Key Files (Backend)

```
src/services/bloodwork_parser.py       # PDF/image parsing with Claude Sonnet 4
src/routes/uploads.py                  # Upload endpoint
src/modules/metrics/service.py         # get_by_type_prefix(), get_biomarkers_grouped()
src/modules/ai_coach/tools/fitness_tools.py  # Biomarker tools for AI coach
```

### Key Files (Mobile)

```
features/bloodwork/
├── types.ts                           # TypeScript types (Metric, BiomarkerTestGroup, etc.)
├── hooks/useBloodwork.ts              # React Query hooks (8 hooks)
├── components/
│   └── BloodworkResults.tsx           # Categorized biomarker display
└── index.ts                           # Re-exports

app/(modals)/bloodwork/
├── index.tsx                          # Main hub (Upload + History tabs)
├── [date].tsx                         # View biomarkers for specific test date
└── trend/[biomarker].tsx              # Trend chart for individual biomarker
```

### AI Coach Biomarker Tools

```python
get_latest_biomarkers()          # All markers from latest upload
get_biomarker_trend(name)        # Historical trend for specific marker
get_bloodwork_summary()          # Summary by category (Lipids, Metabolic, etc.)
```

### Biomarker Storage Pattern

Biomarkers are stored in the existing METRICS table with:
- `metric_type`: `biomarker_{standardized_name}` (e.g., `biomarker_haemoglobin`)
- `unit`: The measurement unit (e.g., "g/L")
- `reference_low` / `reference_high`: Reference range
- `flag`: `low`, `normal`, `high`, or `abnormal`

### Onboarding Integration

The PROFILE module tracks `bloodwork_uploaded` as an optional onboarding step. Users can:
- Upload during registration
- Skip and upload later from settings
- Upload multiple times (new tests update the record)

### History & Trend Tracking

**Bloodwork History View:**
- Groups all biomarker tests by date
- Shows count of normal vs flagged biomarkers per test
- Pull-to-refresh to update data
- Tap a test date to see all biomarkers from that test

**Biomarker Trend View:**
- Historical chart of values over time
- Trend direction indicator (up/down/stable)
- Percentage change calculation
- Reference range overlay on chart

**Data Structure:**
```typescript
interface BiomarkerTestGroup {
  test_date: string;          // ISO date
  biomarker_count: number;    // Total biomarkers in test
  normal_count: number;       // Within reference range
  abnormal_count: number;     // Flagged low/high
  biomarkers: Metric[];       // Full biomarker details
}
```

---

## Social Feature

Complete social networking with friends, followers, leaderboards, and challenges.

### Database Tables

```sql
friendships (id, identity_id_a, identity_id_b, status, requested_by, created_at)
follows (id, follower_id, following_id, created_at)
challenges (id, name, challenge_type, goal_value, start_date, end_date, join_code)
challenge_participants (id, challenge_id, identity_id, current_progress, rank)
```

### Challenge Types

| Type | Description | Unit |
|------|-------------|------|
| `fasting_streak` | Longest fasting streak | days |
| `workout_count` | Most workouts completed | workouts |
| `total_xp` | Most XP earned | XP |
| `consistency` | Most days logged in | days |

### API Endpoints

```
# Friends
POST   /social/friends/request              # Send friend request
GET    /social/friends                      # List friends
POST   /social/friends/requests/{id}/respond # Accept/decline

# Leaderboards
GET    /social/leaderboards/{type}          # global_xp, friends_xp, etc.

# Challenges
POST   /social/challenges                   # Create challenge
GET    /social/challenges/{id}              # Challenge detail
POST   /social/challenges/{id}/join         # Join by ID
POST   /social/challenges/join/{code}       # Join by code
```

### Challenge Progress Auto-Update

Progress is automatically updated when:
- Fast window is closed as completed (TIME_KEEPER)
- Workout session is completed (CONTENT)

---

## AI Coach Safety

The AI coach includes comprehensive safety filtering to prevent medical advice.

### Blocked Topics

- Medical conditions (diabetes, heart disease, cancer, eating disorders)
- Emergencies (chest pain, difficulty breathing) → Redirect to 911
- Allergies (food allergies, celiac, anaphylaxis)
- Medications (drug interactions, prescriptions)

### Safe Topics

- Fasting schedules and protocols
- Workout guidance and technique
- Motivation and habit building
- General wellness tips

### Implementation

```python
# src/modules/ai_coach/safety.py
check_message_safety(message)     # Pre-filter user messages
filter_ai_response(response)      # Post-filter AI responses
get_safety_disclaimer()           # Standard health disclaimer
```

---

## Cost Breakdown

### AI/LLM Costs

| Provider | Cost | Notes |
|----------|------|-------|
| **Ollama** (local) | $0 | Free - runs locally, default for dev |
| **Groq** | Free tier, then ~$0.05/1K tokens | Fast, good free tier |
| **Claude API** | ~$3-15/1M tokens | Best quality |

**Bloodwork Parsing:** ~$0.01-0.02 per upload (Claude Sonnet)

### Module Cost Impact

| Module | AI Cost | Notes |
|--------|---------|-------|
| IDENTITY | $0 | JWT tokens, database only |
| TIME_KEEPER | $0 | Timer logic, database only |
| METRICS | $0 | Weight/stats, database only |
| PROGRESSION | $0 | Streaks/XP, database only |
| CONTENT | $0 | Serving videos, CDN costs only |
| **AI_COACH** | 💰 | **Only module with LLM costs** |
| **RESEARCH** | 💰 | Claude Haiku for summaries |

### Infrastructure Costs

| Service | Dev | Prod (1K users) | Prod (10K users) |
|---------|-----|-----------------|------------------|
| **Hosting** (Fly.io) | $0 | $5-20/mo | $50-100/mo |
| **Database** (Postgres) | $0 | $0-15/mo | $25-50/mo |
| **Push** (Expo) | $0 | $0 | $0 |
| **AI (Claude)** | $0 | $50-200/mo | $200-1000/mo |

### Monthly Cost Summary

| Phase | Users | Estimated Cost |
|-------|-------|----------------|
| Development | 1 | $0 |
| MVP Launch | 100 | $5-50 |
| Early Growth | 1,000 | $50-300 |
| Scale | 10,000 | $300-1,500 |

### Cost Optimization Strategies

```python
# 1. Rate limit AI chats per user
MAX_AI_CHATS_FREE = 10/day
MAX_AI_CHATS_PREMIUM = 50/day

# 2. Use cheaper models for simple queries
simple_questions → groq:llama-3.1-8b (free)
complex_coaching → anthropic:claude-3-5-sonnet (paid)

# 3. Cache common responses
"How long should I fast?" → cached, no AI call
```
