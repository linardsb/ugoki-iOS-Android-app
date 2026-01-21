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
| POST | `/api/v1/content/workout-sessions` | Start workout session | Yes |
| POST | `/api/v1/content/workout-sessions/{id}/complete` | Complete workout | Yes |

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
1. Create workout session TIME_WINDOW
2. Initialize exercise queue
3. Start first exercise timer

### Completing a Workout
1. Mark session as completed
2. Record ACTIVITY_EVENT
3. Award XP based on duration/difficulty
4. Update workout streak

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
