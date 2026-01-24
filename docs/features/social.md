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

## Request/Response Models

### Friend Request

**Send Request:**
```typescript
interface SendFriendRequestPayload {
  identity_id: string;  // UUID of user to befriend
}
```

**Accept/Decline Request:**
```typescript
interface RespondFriendRequestPayload {
  accept: boolean;  // true = accept, false = decline
}

// Response (both accept and decline)
interface RespondFriendRequestResponse {
  id: string;
  status: "accepted" | "declined";
  identity_id_a: string;
  identity_id_b: string;
  created_at: string;  // ISO datetime
}
```

**Get Pending Requests Response:**
```typescript
interface PendingFriendRequest {
  id: string;
  from_identity_id: string;
  from_user: {
    display_name: string;
    avatar_url: string | null;
    current_xp: number;
    current_level: number;
  };
  created_at: string;  // ISO datetime
}

interface PendingRequestsResponse {
  requests: PendingFriendRequest[];
  total_count: number;
}
```

**Get Friends List Response:**
```typescript
interface Friend {
  id: string;
  identity_id: string;
  display_name: string;
  avatar_url: string | null;
  current_xp: number;
  current_level: number;
  current_fasting_streak: number;
}

interface FriendsListResponse {
  friends: Friend[];
  total_count: number;
}
```

### Leaderboard Pagination

**Query Parameters (all leaderboard endpoints):**
```
GET /api/v1/social/leaderboards/{type}?limit=20&offset=0
```

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 20 | 100 | Number of results to return |
| `offset` | integer | 0 | - | Number of results to skip (for pagination) |

**Leaderboard Entry:**
```typescript
interface LeaderboardEntry {
  rank: number;              // 1-based ranking
  identity_id: string;
  display_name: string;
  avatar_url: string | null;
  value: number;             // XP, streak days, or challenge progress
  trend: "up" | "down" | "—"; // Direction vs. previous day
}

interface LeaderboardResponse {
  type: "global_xp" | "friends_xp" | "global_streak";
  entries: LeaderboardEntry[];
  total_count: number;
  your_rank: number | null;  // null if not on leaderboard
  your_value: number;
}
```

### Challenge Request/Response

**Create Challenge:**
```typescript
interface CreateChallengePayload {
  name: string;                                              // Max 100 chars
  description: string;                                       // Optional
  challenge_type: "fasting_streak" | "workout_count" | "total_xp" | "consistency";
  goal_value: number;                                        // Target value to win
  start_date: string;                                        // ISO date (YYYY-MM-DD)
  end_date: string;                                          // ISO date, must be > start
  invite_identity_ids?: string[];                           // Optional: auto-invite friends
}

interface CreateChallengeResponse {
  id: string;
  join_code: string;         // 8-char code for sharing
  name: string;
  challenge_type: string;
  goal_value: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}
```

**Join Challenge Response:**
```typescript
interface JoinChallengeResponse {
  challenge_id: string;
  participant_id: string;
  current_progress: number;
  rank: number | null;       // null until challenge starts
  joined_at: string;
}
```

**Challenge Details Response:**
```typescript
interface ChallengeParticipant {
  rank: number;
  identity_id: string;
  display_name: string;
  avatar_url: string | null;
  current_progress: number;
  joined_at: string;
}

interface ChallengeDetailsResponse {
  id: string;
  name: string;
  description: string | null;
  challenge_type: string;
  goal_value: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  join_code: string;
  participants: ChallengeParticipant[];
  total_participants: number;
  your_rank: number | null;
  your_progress: number;
  time_remaining_hours: number;
}
```

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
