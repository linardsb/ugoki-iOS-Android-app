# Feature: Research Hub

Scientific paper browsing with AI summaries from PubMed.

---

## Overview

The Research Hub allows users to browse and search scientific research on health topics. Papers are fetched from PubMed and summarized by Claude Haiku into bite-sized, actionable insights. Users have a daily search quota to manage AI costs.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to browse research by topic so that I learn about IF and HIIT science
- As a user, I want AI summaries so that I quickly understand complex papers
- As a user, I want to save papers so that I can reference them later
- As a user, I want to see my search quota so that I know how many searches I have left

---

## Topics

| Topic | Description | Color |
|-------|-------------|-------|
| intermittent_fasting | Time-restricted eating, metabolic benefits | Teal (#14b8a6) |
| hiit | High-intensity interval training | Orange (#f97316) |
| nutrition | Diet, macronutrients, health effects | Green (#22c55e) |
| sleep | Sleep quality, recovery, circadian rhythm | Purple (#8b5cf6) |

---

## API Endpoints

| Method | Endpoint | Description | Quota |
|--------|----------|-------------|-------|
| GET | `/api/v1/research/topics` | List topics | No |
| GET | `/api/v1/research/topics/{topic}` | Papers by topic | No |
| GET | `/api/v1/research/search` | Search papers | Yes |
| GET | `/api/v1/research/papers/{id}` | Paper details | No |
| POST | `/api/v1/research/saved` | Save paper | No |
| DELETE | `/api/v1/research/saved/{id}` | Unsave paper | No |
| GET | `/api/v1/research/saved` | Get saved papers | No |
| GET | `/api/v1/research/quota` | Check quota | No |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/research/service.py` | Research logic, caching |
| `apps/api/src/modules/research/routes.py` | API endpoints |
| `apps/api/src/modules/research/sources/pubmed.py` | PubMed API adapter |
| `apps/api/src/modules/research/ai/summarizer.py` | Claude Haiku summarization |
| `apps/api/src/modules/research/orm.py` | Database models |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/research/hooks/useResearch.ts` | React Query hooks |
| `apps/mobile/features/research/components/TopicPill.tsx` | Topic selector |
| `apps/mobile/features/research/components/ResearchCard.tsx` | Paper card |
| `apps/mobile/features/research/components/QuotaIndicator.tsx` | Quota display |
| `apps/mobile/features/research/components/AbstractBullets.tsx` | "At a Glance" bullet points |
| `apps/mobile/app/(modals)/research/index.tsx` | Research hub screen |
| `apps/mobile/app/(modals)/research/[id].tsx` | Paper detail screen |

---

## AI-Generated Digest

Each paper is summarized into a `ResearchDigest`:

```typescript
interface ResearchDigest {
  one_liner: string; // Single sentence key finding
  key_benefits: Benefit[]; // Array of takeaways
  audience_tags: string[]; // Who benefits
  tldr: string; // 2-3 sentence summary
  abstract_bullets: string[]; // 3-5 scannable bullet points (At a Glance)
}

interface Benefit {
  emoji: string;
  title: string;
  description: string;
}
```

The `abstract_bullets` field provides a quick "At a Glance" view of the paper's key points, making long abstracts more digestible for users scanning through research.

---

## PubMed Integration

Uses NCBI E-utilities API (free, no key required for <3 req/sec):

1. **ESearch** - Get list of PMIDs matching query
2. **EFetch** - Fetch paper details (title, authors, abstract, journal, date)

Papers are cached in database to minimize API calls.

---

## Quota System

| Aspect | Value |
|--------|-------|
| Daily limit | 15 searches |
| Reset time | Midnight UTC |
| Topic browsing | Unlimited (no quota) |

Quota tracked in `user_search_quotas` table.

---

## Data Models

### Research Paper

```typescript
interface ResearchPaper {
  id: string;
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publication_date: string;
  abstract: string;
  topic: string;
  digest: ResearchDigest | null;
  doi: string | null;
  url: string;
}
```

### Quota Info

```typescript
interface QuotaInfo {
  searches_remaining: number;
  searches_used: number;
  resets_at: string; // ISO datetime
}
```

---

## API Response Examples

### Search Response

```json
{
  "results": [
    {
      "id": "uuid-1",
      "pmid": "35641234",
      "title": "Effects of Intermittent Fasting on Metabolic Health",
      "authors": ["Smith J", "Johnson A", "Davis B"],
      "journal": "Journal of Clinical Nutrition",
      "publication_date": "2023-06-15",
      "abstract": "This study examined the effects of time-restricted feeding...",
      "topic": "fasting",
      "digest": {
        "one_liner": "Intermittent fasting improves insulin sensitivity and weight loss.",
        "key_benefits": [
          {
            "emoji": "⚡",
            "title": "Improved Energy",
            "description": "Increased metabolic flexibility and sustained energy"
          },
          {
            "emoji": "📉",
            "title": "Weight Loss",
            "description": "Average 5% body weight reduction over 12 weeks"
          }
        ],
        "audience_tags": ["fitness", "health", "longevity"],
        "tldr": "Time-restricted eating shows promise for metabolic improvement and sustainable weight management without restrictive calorie counting.",
        "abstract_bullets": [
          "16:8 fasting protocol reduces insulin levels by 12-18%",
          "No significant muscle loss when combined with resistance training",
          "Best results when started gradually (2-4 week adaptation period)"
        ]
      },
      "doi": "10.1234/example",
      "url": "https://pubmed.ncbi.nlm.nih.gov/35641234/"
    }
  ],
  "total_results": 247,
  "quota": {
    "searches_remaining": 12,
    "searches_used": 3,
    "resets_at": "2026-01-25T00:00:00Z"
  }
}
```

### Topic Browse Response

```json
{
  "topic": "fasting",
  "papers": [
    {
      "id": "uuid-2",
      "pmid": "35641235",
      "title": "Circadian Rhythms and Intermittent Fasting",
      "authors": ["Lee K", "Chen M"],
      "journal": "Nature Metabolism",
      "publication_date": "2023-09-01",
      "abstract": "..."
    }
  ],
  "topic_description": "Intermittent fasting research including health benefits, protocols, and metabolic effects",
  "paper_count": 1542
}
```

### Quota Status Response

```json
{
  "searches_remaining": 14,
  "searches_used": 1,
  "daily_limit": 15,
  "resets_at": "2026-01-25T00:00:00Z",
  "next_reset_hours": 3
}
```

---

## Caching Strategy

```
User Search
     │
     ▼
┌─────────────┐
│Check Cache  │ → Hit → Return cached
└──────┬──────┘
       │ Miss
       ▼
┌─────────────┐
│PubMed API   │ → Fetch papers
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Claude Haiku │ → Generate digest
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Cache Result │ → Store for future
└─────────────┘
```

---

## Cost Considerations

| Operation | Cost |
|-----------|------|
| PubMed API | Free |
| Claude Haiku summary | ~$0.001 per paper |
| 15 searches × 10 papers | ~$0.15/user/day max |

---

## Known Issues

| ID | Description | Status |
|----|-------------|--------|
| - | Timezone datetime mismatch | Resolved (commit 0ce18294) |

---

## Future Enhancements

- [ ] Paper recommendations based on history
- [ ] Share papers socially
- [ ] Highlight/annotate saved papers
- [ ] Weekly research digest email
- [ ] Premium tier with unlimited searches

---

## References

- **PRD Section:** [PRD.md#research-hub](../product/PRD.md#34-research-hub)
- **Module Spec:** [MODULES.md#research](../architecture/MODULES.md#11-research-module)
- **Decision:** [DECISIONS.md#DEC-012](../product/DECISIONS.md#dec-012-research-quota-system-15day)
