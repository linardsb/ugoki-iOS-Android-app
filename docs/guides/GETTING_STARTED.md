# Getting Started with UGOKI

Complete setup guide for new developers.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.12+ | Backend runtime |
| uv | Latest | Python package manager |
| Node.js | 20+ | Mobile build tools |
| Bun | Latest | JavaScript package manager |
| PostgreSQL | 15+ | Database |
| Git | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| Docker | Database container |
| Expo Go | Mobile testing on device |
| iOS Simulator | iOS development (macOS) |
| Android Studio | Android development |

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/linardsb/ugoki-iOS-Android-app.git
cd ugoki_1_0
```

### 2. Backend Setup

```bash
cd apps/api

# Install dependencies
uv sync

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
uv run alembic upgrade head

# Seed initial data (workouts, exercises, achievements)
uv run python scripts/seed_workouts.py
uv run python -m src.modules.progression.seed

# Start development server
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

API available at: http://localhost:8000
Docs available at: http://localhost:8000/docs

### 3. Mobile Setup

```bash
cd apps/mobile

# Install dependencies
bun install

# Start Expo development server
bun run start
```

Press `i` for iOS Simulator, `a` for Android, or scan QR with Expo Go.

---

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ugoki

# JWT
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

# LLM Provider Configuration (Choose one)
# Option 1: Groq (Recommended for fast responses)
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Option 2: Anthropic Claude (Default)
# LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Option 3: OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4

# Option 4: Ollama (Local - slow but free)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434

# Push Notifications
EXPO_ACCESS_TOKEN=...

# Email
RESEND_API_KEY=re_...

# Embeddings (for RAG/document retrieval)
EMBEDDING_API_KEY=...  # Required if enabling RAG tools
```

**Important:** The default is `LLM_PROVIDER=anthropic` using Claude. Choose your provider based on your needs:
- **Groq:** Fastest (0.3s), good for production
- **Anthropic:** Most capable, better reasoning
- **OpenAI:** Widely supported, flexible models
- **Ollama:** Free, runs locally (slower)

### Mobile (app.config.js)

```javascript
export default {
  extra: {
    apiUrl: process.env.API_URL || 'http://localhost:8000',
  },
};
```

---

## Database Setup

### Option 1: Local PostgreSQL

```bash
# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb ugoki
```

### Option 2: Docker

```bash
docker run -d \
  --name ugoki-db \
  -e POSTGRES_USER=ugoki \
  -e POSTGRES_PASSWORD=ugoki \
  -e POSTGRES_DB=ugoki \
  -p 5432:5432 \
  postgres:15
```

### Run Migrations

```bash
cd apps/api
uv run alembic upgrade head
```

---

## Development Workflow

### Daily Development

```bash
# Terminal 1: Backend
cd apps/api
uv run uvicorn src.main:app --reload

# Terminal 2: Mobile
cd apps/mobile
bun run start
```

### Running Tests

```bash
# Backend tests
cd apps/api
uv run pytest

# Mobile tests
cd apps/mobile
bun run test
```

### Creating Migrations

```bash
cd apps/api

# Auto-generate migration
uv run alembic revision --autogenerate -m "description"

# Apply migration
uv run alembic upgrade head

# Rollback
uv run alembic downgrade -1
```

---

## Project Navigation

### Key Directories

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/` | Backend black box modules |
| `apps/api/src/routes/` | Non-module API routes |
| `apps/mobile/app/` | Mobile screens (Expo Router) |
| `apps/mobile/features/` | Mobile feature modules |
| `apps/mobile/shared/` | Shared utilities |
| `docs/` | Documentation |

### Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/main.py` | API entry point |
| `apps/mobile/app/_layout.tsx` | Root layout |
| `apps/mobile/shared/api/client.ts` | API client |
| `CLAUDE.md` | AI assistant context |

---

## Common Tasks

### Add New Backend Dependency

```bash
cd apps/api
uv add package-name
```

### Add New Mobile Dependency

```bash
cd apps/mobile
bun add package-name
```

### Add New Module

1. Create folder: `apps/api/src/modules/{name}/`
2. Add files: `__init__.py`, `interface.py`, `service.py`, `routes.py`, `models.py`, `orm.py`
3. Register routes in `src/main.py`
4. Create feature doc: `docs/features/{name}.md`

### Add New Mobile Feature

1. Create folder: `apps/mobile/features/{name}/`
2. Add files: `index.ts`, `types.ts`, `hooks/`, `components/`
3. Add screens in `apps/mobile/app/`

---

## Troubleshooting

### Backend Won't Start

```bash
# Check Python version
python --version  # Should be 3.12+

# Reinstall dependencies
uv sync --reinstall

# Check database connection
uv run python -c "from src.database import engine; print('OK')"
```

### Mobile Won't Start

```bash
# Clear caches
bun run start --clear

# Reinstall dependencies
rm -rf node_modules
bun install

# Reset Expo
npx expo start --clear
```

### Database Issues

```bash
# Check connection
psql -h localhost -U ugoki -d ugoki

# Reset database
uv run alembic downgrade base
uv run alembic upgrade head
uv run python scripts/seed_workouts.py
uv run python -m src.modules.progression.seed
```

---

## Next Steps

1. Read [architecture/OVERVIEW.md](../architecture/OVERVIEW.md) for system design
2. Review [PRD.md](../product/PRD.md) for feature requirements
3. Check [CODING_STANDARDS.md](../standards/CODING_STANDARDS.md) for conventions
4. Pick a feature from [ROADMAP.md](../product/ROADMAP.md) to work on

---

## References

- **Backend Guide:** [BACKEND.md](BACKEND.md)
- **Mobile Guide:** [MOBILE.md](MOBILE.md)
- **Testing Guide:** [TESTING.md](TESTING.md)
