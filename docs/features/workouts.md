# Feature: HIIT Workouts

Workout library with video player, exercise catalog, and body focus filtering.

---

## Overview

UGOKI provides a curated library of workouts designed for busy professionals. Workouts are 8-25 minutes with exercise instructions. The exercise library includes body focus filtering (upper, lower, core, full body) and difficulty levels.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to browse workouts so that I can choose one to do
- As a user, I want to filter exercises by body focus so that I can target specific areas
- As a user, I want to follow along with video instructions so that I use proper form
- As a user, I want to track completed workouts so that I see my progress

---

## Workout Catalog

| Category | Count | Duration |
|----------|-------|----------|
| HIIT | 10 | 10-20 min |
| Strength | 3 | 15-20 min |
| Cardio | 3 | 12-25 min |
| Flexibility | 3 | 10-25 min |
| Recovery | 4 | 8-15 min |
| **Total** | **23** | 8-25 min |
| **Exercises** | **114** | Varies |

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/content/workouts` | List all workouts | No |
| GET | `/api/v1/content/workouts/{id}` | Get workout details | No |
| GET | `/api/v1/content/exercises` | List exercises with filters | No |
| POST | `/api/v1/content/sessions` | Start workout session | Yes |
| GET | `/api/v1/content/sessions/active` | Get active workout session | Yes |
| GET | `/api/v1/content/sessions/history` | Get workout session history | Yes |
| POST | `/api/v1/content/sessions/{session_id}/complete` | Complete workout | Yes |
| POST | `/api/v1/content/sessions/{session_id}/abandon` | Abandon workout in progress | Yes |

### Exercise Filters

```
GET /api/v1/content/exercises?body_focus=upper&difficulty=beginner
```

| Filter | Values |
|--------|--------|
| body_focus | upper, lower, core, full_body |
| difficulty | beginner, intermediate, advanced |
| equipment | none, dumbbells, resistance_band |

---

## Recipe Endpoints

Recipes are meal suggestions that complement workouts and fasting windows.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/content/recipes` | List all recipes | No |
| GET | `/api/v1/content/recipes/{id}` | Get recipe details | No |
| POST | `/api/v1/content/recipes/saved` | Save recipe to favorites | Yes |
| DELETE | `/api/v1/content/recipes/saved/{id}` | Remove from saved recipes | Yes |
| GET | `/api/v1/content/recipes/saved/list` | Get user's saved recipes | Yes |

### Recipe Details

Each recipe includes nutritional info, meal prep time, and compatibility with fasting protocols.

---

## Additional Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/content/categories` | Get workout categories | No |
| GET | `/api/v1/content/recommendations` | AI-generated workout recommendations | Yes |
| GET | `/api/v1/content/stats` | User workout statistics (total time, completed, streak) | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/content/service.py` | Workout/exercise queries |
| `apps/api/src/modules/content/routes.py` | Content API endpoints |
| `apps/api/src/modules/content/models.py` | Workout, Exercise models |
| `apps/api/scripts/seed_workouts.py` | Workout definitions |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/workouts/hooks/useWorkouts.ts` | React Query hooks |
| `apps/mobile/features/workouts/components/WorkoutCard.tsx` | Workout preview |
| `apps/mobile/app/(tabs)/workouts.tsx` | Workout list screen |
| `apps/mobile/app/(modals)/workout/[id].tsx` | Workout detail screen |
| `apps/mobile/app/(modals)/workout-player.tsx` | Video player |

---

## Data Models

### Workout

```typescript
interface Workout {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  thumbnail_url: string;
  video_url: string;
  exercises: Exercise[];
}
```

### Exercise

```typescript
interface Exercise {
  id: string;
  name: string;
  description: string;
  duration_seconds: number;
  body_focus: "upper" | "lower" | "core" | "full_body";
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: "none" | "dumbbells" | "resistance_band";
  video_url: string | null;
  thumbnail_url: string | null;
}
```

---

## Workout Player Flow

```
Workout Detail → Start Workout → Exercise 1 → Rest → Exercise 2 → ... → Complete
                                     │
                                     ▼
                              [Play/Pause]
                              [Skip Exercise]
                              [End Workout]
```

---

## Business Logic

### Starting a Workout
1. POST `/api/v1/content/sessions` with workout_id
2. Backend creates TIME_WINDOW with type="workout" and state="active"
3. Mobile receives session_id and initializes exercise queue
4. Start first exercise timer

### Getting Active Workout
1. GET `/api/v1/content/sessions/active` to fetch current session
2. Mobile displays current exercise and remaining time
3. User can skip exercises or pause

### Completing a Workout
1. POST `/api/v1/content/sessions/{session_id}/complete`
2. Backend marks session as completed
3. Records ACTIVITY_EVENT
4. Awards XP based on duration/difficulty
5. Updates workout streak in progression module

### Abandoning a Workout
1. POST `/api/v1/content/sessions/{session_id}/abandon`
2. Backend marks session as abandoned
3. No XP or streak credit awarded

### Exercise Deduplication
Exercises are shared across workouts. The listing endpoint deduplicates by name to show unique exercises for filtering.

---

## Progression Integration

| Action | XP Earned |
|--------|-----------|
| Complete 10-min workout | 30 XP |
| Complete 15-min workout | 45 XP |
| Complete 20-min workout | 60 XP |
| Complete advanced workout | +20 XP bonus |

---

## Body Focus Metadata

Each exercise has a `body_focus` field:

| Value | Target Areas |
|-------|--------------|
| upper | Arms, shoulders, chest, back |
| lower | Legs, glutes, hips |
| core | Abs, obliques, lower back |
| full_body | All areas |

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] Custom workout creation
- [ ] Workout scheduling/reminders
- [ ] Rest day recommendations
- [ ] Workout history with stats
- [ ] Video download for offline

---

## References

- **PRD Section:** [PRD.md#hiit-workouts](../product/PRD.md#32-hiit-workouts)
- **Module Spec:** [MODULES.md#content](../architecture/MODULES.md#5-content-module)
