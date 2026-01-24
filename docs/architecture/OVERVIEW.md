# UGOKI Architecture Overview

High-level system design following black box modular principles.

---

## Design Philosophy

**Black Box Architecture** following Eskil Steenberg's principles:

1. Each module is a replaceable black box with a clean interface
2. Modules communicate only through defined interfaces
3. Implementation details are completely hidden
4. One person can own one module entirely
5. Modules are testable in isolation

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP                                 │
│                     (Expo React Native)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Fasting │ │Workouts │ │AI Coach │ │ Social  │ │Research │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Bloodwork│ │ Recipes │ │ Health  │ │Dashboard│ │ Profile │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                           │ TanStack Query                           │
│                           ▼                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │ HTTPS/REST
                            ▼
┌───────────────────────────┼──────────────────────────────────────────┐
│                      API GATEWAY                                      │
│                     (FastAPI)                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Authentication                             │   │
│  │                    (JWT + Anonymous)                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│       │           │           │           │           │              │
│       ▼           ▼           ▼           ▼           ▼              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │IDENTITY │ │  TIME   │ │ METRICS │ │PROGRESS │ │ CONTENT │       │
│  │         │ │ KEEPER  │ │         │ │  ION    │ │         │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │PROFILE  │ │AI_COACH │ │ SOCIAL  │ │RESEARCH │ │NOTIFIC. │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐                                                         │
│  │ EVENT   │              11 Black Box Modules                       │
│  │ JOURNAL │                                                         │
│  └─────────┘                                                         │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐    │
│  │        PostgreSQL           │  │      Cloudflare R2          │    │
│  │        (Primary DB)         │  │      (File Storage)         │    │
│  └─────────────────────────────┘  └─────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Claude    │  │   PubMed    │  │ Expo Push   │  │   Resend    │  │
│  │   (AI)      │  │   (Papers)  │  │  (Notif.)   │  │   (Email)   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Module Boundaries

Each module owns its:
- Database tables (no cross-module table access)
- API endpoints (prefixed by module)
- Business logic (in service layer)
- Pydantic models (interface contracts)

Modules communicate via:
- Interface method calls (within API process)
- Events (for async notifications)
- Never direct database queries

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.12+ |
| ORM | SQLAlchemy 2.0 (async) |
| Validation | Pydantic 2.0 |
| Migrations | Alembic |
| Package Manager | uv |

### Mobile
| Component | Technology |
|-----------|------------|
| Framework | React Native |
| Platform | Expo SDK 52 |
| UI | Tamagui |
| State | Zustand |
| Data Fetching | TanStack Query |
| Navigation | Expo Router |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Hosting | Fly.io |
| Database | PostgreSQL |
| File Storage | Cloudflare R2 |
| Push Notifications | Expo Push |
| Email | Resend |
| Monitoring | Sentry + Logfire |

---

## Data Flow Patterns

### Read Path
```
Mobile → TanStack Query → API Gateway → Module Service → ORM → PostgreSQL
                                    ↓
                              Response Models (Pydantic)
```

### Write Path
```
Mobile → Mutation → API Gateway → Module Service → ORM → PostgreSQL
                              ↓
                        Event Journal (audit)
                              ↓
                        Progression Update (XP/streaks)
```

### AI Path
```
Mobile → AI Coach API → Agent → Tools → Other Module Interfaces
                    ↓
              Claude API
                    ↓
              Response + Safety Filter
```

---

## Project Structure

```
ugoki_1_0/
├── apps/
│   ├── api/                          # Python FastAPI backend
│   │   ├── src/
│   │   │   ├── main.py               # App entry point
│   │   │   ├── modules/              # Black box modules
│   │   │   │   ├── identity/
│   │   │   │   ├── time_keeper/
│   │   │   │   ├── metrics/
│   │   │   │   ├── progression/
│   │   │   │   ├── content/
│   │   │   │   ├── ai_coach/
│   │   │   │   ├── notification/
│   │   │   │   ├── profile/
│   │   │   │   ├── event_journal/
│   │   │   │   ├── social/
│   │   │   │   └── research/
│   │   │   ├── routes/               # Non-module routes
│   │   │   └── services/             # Shared services
│   │   ├── scripts/                  # Seed scripts
│   │   └── tests/
│   │
│   └── mobile/                       # Expo React Native
│       ├── app/                      # Expo Router screens
│       │   ├── (auth)/               # Auth flow
│       │   ├── (tabs)/               # Main tabs
│       │   └── (modals)/             # Modal screens
│       ├── features/                 # Feature modules
│       └── shared/                   # Shared utilities
│
└── docs/                             # Documentation
```

---

## References

- **Primitives:** [PRIMITIVES.md](PRIMITIVES.md)
- **Modules:** [MODULES.md](MODULES.md)
- **Patterns:** [PATTERNS.md](PATTERNS.md)
- **Original Design:** [archive/BlackBox_Design_v2_REFERENCE.md](../archive/BlackBox_Design_v2_REFERENCE.md)
