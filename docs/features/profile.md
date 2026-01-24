# Feature: User Profile

Comprehensive user profile management including personal info, goals, health data, dietary preferences, workout restrictions, and social settings.

---

## Overview

The Profile system stores user-specific information across multiple dimensions: personal goals, health metrics, dietary preferences, workout restrictions, social profile, and notification preferences. It supports onboarding workflows, goal-tracking, health information management, and friend discovery. All profile data is tied to the IDENTITY module for security and GDPR compliance.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to set my fitness goals so that the app can personalize recommendations
- As a user, I want to record my health conditions so that the coach avoids giving unsafe advice
- As a user, I want to specify dietary preferences so that meal recommendations are relevant
- As a user, I want to list workout restrictions so that exercises are safe for me
- As a user, I want to find friends using my friend code so that I can compete on leaderboards
- As a user, I want to manage notification preferences so that I don't get unwanted alerts

---

## API Endpoints

### Core Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/profile` | Create user profile | Yes |
| GET | `/api/v1/profile` | Get user profile | Yes |
| PATCH | `/api/v1/profile` | Update profile (name, bio, age, height, weight) | Yes |
| GET | `/api/v1/profile/complete` | Get full profile with all sections | Yes |

### Goals

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/profile/goals` | Get fitness goals | Yes |
| PATCH | `/api/v1/profile/goals` | Update goals (primary, secondary, timeline) | Yes |

### Health Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/profile/health` | Get health profile | Yes |
| PATCH | `/api/v1/profile/health` | Update health conditions, medications, injuries | Yes |
| GET | `/api/v1/profile/health/fasting-safety` | Check if user can safely fast | Yes |

### Dietary Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/profile/dietary` | Get dietary preferences | Yes |
| PATCH | `/api/v1/profile/dietary` | Update diet type, allergies, restrictions | Yes |

### Workout Restrictions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/profile/workout-restrictions` | Get workout restrictions | Yes |
| PATCH | `/api/v1/profile/workout-restrictions` | Update injuries, limitations, banned exercises | Yes |
| GET | `/api/v1/profile/workout-restrictions/safe-exercises` | Get exercises safe for user | Yes |

### Social Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/profile/social` | Get social profile | Yes |
| PATCH | `/api/v1/profile/social` | Update social display name, privacy settings | Yes |
| GET | `/api/v1/profile/social/check-username` | Check username availability | Yes |
| GET | `/api/v1/profile/social/friend-code/{code}` | Discover user by friend code | No |

### Preferences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/profile/preferences` | Get notification & UI preferences | Yes |
| PATCH | `/api/v1/profile/preferences` | Update preferences (notifications, theme, language) | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/profile/service.py` | Profile operations and validations |
| `apps/api/src/modules/profile/routes.py` | All profile endpoints |
| `apps/api/src/modules/profile/models.py` | Pydantic request/response models |
| `apps/api/src/modules/profile/orm.py` | SQLAlchemy ORM models |
| `apps/api/src/modules/profile/interface.py` | ProfileInterface abstract class |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/profile/hooks/useProfile.ts` | React Query profile hooks |
| `apps/mobile/features/profile/components/ProfileCard.tsx` | Profile display card |
| `apps/mobile/app/(modals)/settings.tsx` | Settings/profile edit screen |
| `apps/mobile/features/profile/stores/profileStore.ts` | Zustand profile state |

---

## Data Models

### User Profile

```typescript
interface UserProfile {
  id: string;
  identity_id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}
```

### User Goals

```typescript
interface UserGoals {
  id: string;
  identity_id: string;
  primary_goal: "weight_loss" | "muscle_gain" | "endurance" | "flexibility" | "general_health";
  secondary_goals: string[];
  target_weight_kg: number | null;
  timeline_weeks: number | null;
  created_at: string;
}
```

### Health Profile

```typescript
interface HealthProfile {
  id: string;
  identity_id: string;
  conditions: string[]; // e.g., ["diabetes", "hypertension"]
  medications: string[];
  allergies: string[];
  past_injuries: string[];
  can_fast_safely: boolean; // Computed based on conditions
  created_at: string;
  updated_at: string;
}
```

### Dietary Profile

```typescript
interface DietaryProfile {
  id: string;
  identity_id: string;
  diet_type: "omnivore" | "vegetarian" | "vegan" | "keto" | "other";
  allergies: string[];
  restrictions: string[];
  dislikes: string[];
  created_at: string;
}
```

### Workout Restrictions

```typescript
interface WorkoutRestrictions {
  id: string;
  identity_id: string;
  injuries: string[];
  limitations: string[];
  banned_exercises: string[];
  preferred_intensity: "low" | "medium" | "high";
  created_at: string;
}
```

### Social Profile

```typescript
interface SocialProfile {
  id: string;
  identity_id: string;
  username: string;
  friend_code: string;
  display_name: string;
  is_public: boolean;
  friends_count: number;
  created_at: string;
}
```

### User Preferences

```typescript
interface UserPreferences {
  id: string;
  identity_id: string;
  notifications_enabled: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  theme: "light" | "dark" | "system";
  language: string;
  created_at: string;
}
```

---

## Database Schema

```sql
-- Core profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  age INT,
  height_cm INT,
  weight_kg DECIMAL,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE user_goals (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  primary_goal VARCHAR NOT NULL,
  secondary_goals TEXT[],
  target_weight_kg DECIMAL,
  timeline_weeks INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health (PHI - Protected Health Information)
CREATE TABLE health_profiles (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  conditions TEXT[],
  medications TEXT[],
  allergies TEXT[],
  past_injuries TEXT[],
  can_fast_safely BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dietary
CREATE TABLE dietary_profiles (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  diet_type VARCHAR,
  allergies TEXT[],
  restrictions TEXT[],
  dislikes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Restrictions
CREATE TABLE workout_restrictions (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  injuries TEXT[],
  limitations TEXT[],
  banned_exercises TEXT[],
  preferred_intensity VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social
CREATE TABLE social_profiles (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  username VARCHAR UNIQUE,
  friend_code VARCHAR UNIQUE,
  display_name TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  notifications_enabled BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  theme VARCHAR DEFAULT 'system',
  language VARCHAR DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Business Logic

### Profile Creation (Onboarding)
1. User creates identity via signup
2. POST `/api/v1/profile` to create profile
3. System initializes all sub-profiles (goals, health, dietary, etc.)
4. Mobile stores profile data in Zustand + AsyncStorage

### Health Safety Checks
- `can_fast_safely` computed on health profile update
- AI Coach checks this before giving fasting advice
- Conditions like diabetes/heart disease trigger cautions
- Health data is classified as PHI (Protected Health Information)

### Friend Discovery
- Each user assigned unique `friend_code`
- Friend code displayed in social profile
- Scanned via QR code or entered manually
- Non-authenticated endpoint allows discovery

### Workout Safety
- GET `/api/v1/profile/workout-restrictions/safe-exercises` filters exercises
- Returns only exercises not in `banned_exercises` list
- Considers intensity preferences

---

## Security & Privacy

### PHI (Protected Health Information)
- Health profile contains sensitive medical data
- Encrypted in transit (HTTPS)
- Never logged in plaintext
- User can export/delete via GDPR endpoints
- Audit trail via EVENT_JOURNAL

### Data Ownership
- Every profile tied to `identity_id`
- Users can only access their own profile
- Authorization checks on all endpoints
- Social profiles optionally public

### Password Reset
- Email verification required for account changes
- Friend code cannot be used for authentication
- Username is display-only, not for login

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] Profile image upload with CDN storage
- [ ] Bio markdown support with preview
- [ ] Privacy controls per profile section
- [ ] Profile visibility settings (public/friends-only/private)
- [ ] Integration with wearable devices for bio data
- [ ] Profile analytics (last updated, completeness score)

---

## References

- **PRD Section:** [PRD.md#user-profiles](../product/PRD.md)
- **Module Spec:** [MODULES.md#profile](../architecture/MODULES.md#profile-module)
- **Security:** [SECURITY.md#pii-isolation](../standards/SECURITY.md#pii-isolation)
