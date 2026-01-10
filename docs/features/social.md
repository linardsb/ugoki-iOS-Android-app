# Feature: Social

Friends, followers, leaderboards, and challenges.

---

## Overview

UGOKI includes social features to increase engagement and motivation. Users can connect with friends, follow others, compete on leaderboards, and participate in challenges. Challenge progress updates automatically based on fasting and workout activity.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to add friends so that we can motivate each other
- As a user, I want to see leaderboards so that I can compete with others
- As a user, I want to create challenges so that I can compete with friends
- As a user, I want to join challenges via code so that I can participate easily

---

## API Endpoints

### Friends

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/friends/request` | Send friend request |
| GET | `/api/v1/social/friends/requests` | Get pending requests |
| POST | `/api/v1/social/friends/requests/{id}/respond` | Accept/decline |
| GET | `/api/v1/social/friends` | List friends |
| DELETE | `/api/v1/social/friends/{id}` | Remove friend |

### Follows

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/follow/{id}` | Follow user |
| DELETE | `/api/v1/social/follow/{id}` | Unfollow user |
| GET | `/api/v1/social/followers` | List followers |
| GET | `/api/v1/social/following` | List following |

### Leaderboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/leaderboards/global_xp` | Global XP ranking |
| GET | `/api/v1/social/leaderboards/friends_xp` | Friends XP ranking |
| GET | `/api/v1/social/leaderboards/global_streak` | Global streak ranking |

### Challenges

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/challenges` | Create challenge |
| GET | `/api/v1/social/challenges` | List my challenges |
| GET | `/api/v1/social/challenges/{id}` | Challenge details |
| POST | `/api/v1/social/challenges/{id}/join` | Join by ID |
| POST | `/api/v1/social/challenges/join/{code}` | Join by code |
| DELETE | `/api/v1/social/challenges/{id}/leave` | Leave challenge |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/social/service.py` | Social logic |
| `apps/api/src/modules/social/routes.py` | API endpoints |
| `apps/api/src/modules/social/models.py` | Pydantic models |
| `apps/api/src/modules/social/orm.py` | Database models |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/social/hooks/useSocial.ts` | React Query hooks |
| `apps/mobile/features/social/components/FriendCard.tsx` | Friend display |
| `apps/mobile/features/social/components/LeaderboardRow.tsx` | Leaderboard row |
| `apps/mobile/features/social/components/ChallengeCard.tsx` | Challenge display |

---

## Database Schema

### Friendships

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY,
  identity_id_a UUID NOT NULL,
  identity_id_b UUID NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, accepted, declined
  requested_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identity_id_a, identity_id_b)
);
```

### Follows

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

### Challenges

```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(50) NOT NULL,
  goal_value INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  join_code VARCHAR(8) UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  identity_id UUID NOT NULL,
  current_progress INTEGER DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, identity_id)
);
```

---

## Challenge Types

| Type | Description | Unit | Auto-Update |
|------|-------------|------|-------------|
| fasting_streak | Longest consecutive fasts | days | Yes |
| workout_count | Most workouts completed | count | Yes |
| total_xp | Most XP earned | XP | Yes |
| consistency | Most days with activity | days | Yes |

---

## Progress Auto-Update

Challenge progress updates automatically when:

1. **Fasting streak** - Updated when fast window closes as completed
2. **Workout count** - Updated when workout session completes
3. **Total XP** - Updated when any XP is earned
4. **Consistency** - Updated when any activity is logged

```python
# In TIME_KEEPER after fast completion
async def on_fast_completed(identity_id: str):
    await social_service.update_challenge_progress(
        identity_id,
        challenge_type="fasting_streak"
    )
```

---

## Leaderboard Types

| Type | Metric | Scope |
|------|--------|-------|
| global_xp | Total XP | All users |
| friends_xp | Total XP | Friends only |
| global_streak | Current fasting streak | All users |
| challenge_{id} | Challenge progress | Participants |

---

## Join Codes

- 8 character alphanumeric
- Case-insensitive
- Generated on challenge creation
- Shareable via link or text

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] Activity feed (friend updates)
- [ ] Direct messaging
- [ ] Team challenges
- [ ] Public profiles
- [ ] Achievement sharing

---

## References

- **PRD Section:** [PRD.md#social-features](../product/PRD.md#36-social-features)
- **Module Spec:** [MODULES.md#social](../architecture/MODULES.md#10-social-module)
