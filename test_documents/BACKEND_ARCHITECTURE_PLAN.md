# Ugoki Backend Architecture Plan

## Executive Summary

Backend architecture for a health/wellness platform focusing on Intermittent Fasting (IF), HIIT workouts, and personalized nutrition. Designed for MVP scale (1-10K users) using TypeScript/NestJS on AWS, with clear evolution path to microservices.

---

## 1. Technology Stack

### Core Framework
- **NestJS** (TypeScript) - modular, scalable, excellent for REST/WebSocket
- **Node.js 20 LTS** - runtime
- **pnpm** - package management

### Database Layer
| Database | Purpose | Rationale |
|----------|---------|-----------|
| **PostgreSQL 16** | Primary relational data | ACID compliance, JSONB for flexibility |
| **TimescaleDB** | Time-series health metrics | 169% better insert performance vs MongoDB for time-series |
| **Redis 7** | Caching, sessions, pub/sub | Real-time features, rate limiting |

### AWS Services
| Service | Purpose |
|---------|---------|
| **ECS Fargate** | Container orchestration (serverless) |
| **RDS PostgreSQL** | Managed database |
| **ElastiCache Redis** | Managed caching |
| **S3** | Media storage (videos, images) |
| **CloudFront** | CDN for static assets |
| **SQS** | Message queuing |
| **Cognito** | OAuth social login (Facebook, Google) |
| **API Gateway** | Rate limiting, request validation |
| **CloudWatch** | Monitoring, logging |

---

## 2. Architecture Pattern: Modular Monolith

For MVP, use a **modular monolith** - a single deployable unit with clear module boundaries that can be extracted to microservices later.

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│              (Rate Limiting, Auth, Routing)                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │   Auth   │ │   User   │ │ Fasting  │ │   Workout    │   │
│  │  Module  │ │  Module  │ │  Module  │ │    Module    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Nutrition│ │ Content  │ │Analytics │ │ Notification │   │
│  │  Module  │ │  Module  │ │  Module  │ │    Module    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │              │              │
┌────────┴──────┐ ┌────┴────┐ ┌──────┴──────┐
│  PostgreSQL   │ │  Redis  │ │     S3      │
│ + TimescaleDB │ │         │ │             │
└───────────────┘ └─────────┘ └─────────────┘
```

### Module Boundaries (Domain-Driven Design)

| Module | Responsibilities |
|--------|-----------------|
| **Auth** | JWT tokens, OAuth2, password reset, 2FA |
| **User** | Profile, preferences, onboarding survey, subscription |
| **Fasting** | IF protocols, timers, fasting windows, streaks |
| **Workout** | HIIT routines, exercise library, workout logging |
| **Nutrition** | Meal plans, recipes, barcode scanning, shopping lists |
| **Content** | Research articles, blog posts, educational content |
| **Analytics** | Progress tracking, dashboards, insights |
| **Notification** | Push notifications, reminders, email |

---

## 3. Database Schema Design

### Core Principles
- **No data duplication** - normalize to 3NF, use JOINs
- **Soft deletes** - `deleted_at` timestamp for audit trails
- **UUID primary keys** - distributed-friendly
- **Audit columns** - `created_at`, `updated_at` on all tables

### Entity Relationship Overview

```
Users ─┬─< UserProfiles (1:1)
       ├─< Subscriptions (1:N)
       ├─< FastingSessions (1:N) ──< FastingLogs (1:N)
       ├─< WorkoutSessions (1:N) ──< ExerciseLogs (1:N)
       ├─< MealLogs (1:N)
       ├─< ProgressMetrics (1:N) [TimescaleDB hypertable]
       ├─< Notifications (1:N)
       └─< UserPreferences (1:1)

FastingProtocols (reference data)
ExerciseLibrary (reference data)
Recipes ──< RecipeIngredients
MealPlans ──< MealPlanItems
ContentArticles ──< ContentTags
```

### Key Tables

```sql
-- Users (core identity)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- NULL for OAuth-only users
    auth_provider VARCHAR(50), -- 'email', 'google', 'facebook'
    auth_provider_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- User Profiles (onboarding data)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    date_of_birth DATE,
    gender VARCHAR(20),
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    body_fat_percentage NUMERIC(4,2),
    fitness_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    health_conditions JSONB DEFAULT '[]',
    dietary_preferences JSONB DEFAULT '{}', -- {vegetarian, vegan, keto, etc.}
    allergies JSONB DEFAULT '[]',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fasting Sessions
CREATE TABLE fasting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    protocol_id UUID REFERENCES fasting_protocols(id),
    started_at TIMESTAMPTZ NOT NULL,
    target_end_at TIMESTAMPTZ NOT NULL,
    actual_end_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Metrics (TimescaleDB hypertable)
CREATE TABLE progress_metrics (
    time TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    metric_type VARCHAR(50) NOT NULL, -- 'weight', 'body_fat', 'heart_rate', 'steps'
    value NUMERIC(10,4) NOT NULL,
    source VARCHAR(50), -- 'manual', 'healthkit', 'google_fit'
    metadata JSONB DEFAULT '{}'
);
SELECT create_hypertable('progress_metrics', 'time');
CREATE INDEX idx_progress_user_time ON progress_metrics (user_id, time DESC);

-- Fasting Protocols (reference data)
CREATE TABLE fasting_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- '16:8', '18:6', '24h', 'OMAD'
    description TEXT,
    fasting_hours INTEGER NOT NULL,
    eating_window_hours INTEGER NOT NULL,
    difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    recommended_frequency VARCHAR(50), -- 'daily', 'weekly', 'occasional'
    benefits JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Sessions
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    routine_id UUID REFERENCES workout_routines(id),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    calories_burned INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises (reference data)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    instructions TEXT,
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    muscle_groups JSONB DEFAULT '[]',
    equipment_needed JSONB DEFAULT '[]',
    difficulty_level VARCHAR(20),
    calories_per_minute INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    calories_per_serving INTEGER,
    image_url VARCHAR(500),
    diet_types JSONB DEFAULT '[]', -- ['keto', 'vegetarian', 'paleo']
    is_bulletproof BOOLEAN DEFAULT FALSE,
    is_slow_cooker BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe Ingredients
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    name VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2),
    unit VARCHAR(50),
    notes VARCHAR(255),
    sort_order INTEGER DEFAULT 0
);

-- Meal Plans
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200),
    week_start_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_type VARCHAR(50) NOT NULL, -- 'free', 'monthly', 'annual'
    status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'expired'
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Articles
CREATE TABLE content_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    author VARCHAR(100),
    image_url VARCHAR(500),
    category VARCHAR(50), -- 'if', 'hiit', 'nutrition', 'sleep', 'research'
    is_premium BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Avoiding Data Duplication

1. **Reference tables** for static data (protocols, exercises, recipes)
2. **JSONB** for flexible metadata without separate tables
3. **Materialized views** for expensive aggregations (weekly stats)
4. **Foreign keys** everywhere - no denormalized copies

---

## 4. API Design

### REST API Structure

```
/api/v1
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh
│   ├── POST   /oauth/{provider}
│   └── POST   /password-reset
├── /users
│   ├── GET    /me
│   ├── PATCH  /me
│   ├── GET    /me/preferences
│   ├── PATCH  /me/preferences
│   └── DELETE /me
├── /fasting
│   ├── GET    /protocols
│   ├── GET    /protocols/:id
│   ├── POST   /sessions
│   ├── GET    /sessions/current
│   ├── PATCH  /sessions/:id
│   ├── POST   /sessions/:id/end
│   ├── GET    /sessions/history
│   └── GET    /streaks
├── /workouts
│   ├── GET    /exercises
│   ├── GET    /exercises/:id
│   ├── GET    /routines
│   ├── GET    /routines/:id
│   ├── POST   /sessions
│   ├── PATCH  /sessions/:id
│   └── GET    /sessions/history
├── /nutrition
│   ├── GET    /recipes
│   ├── GET    /recipes/:id
│   ├── GET    /meal-plans
│   ├── POST   /meal-plans
│   ├── PATCH  /meal-plans/:id
│   ├── POST   /meals
│   ├── POST   /barcode/:code
│   ├── GET    /shopping-list
│   └── POST   /shopping-list/items
├── /content
│   ├── GET    /articles
│   ├── GET    /articles/:slug
│   └── GET    /categories
├── /analytics
│   ├── GET    /dashboard
│   ├── GET    /progress
│   ├── GET    /progress/:metric
│   ├── POST   /metrics
│   └── GET    /streaks
└── /notifications
    ├── GET    /
    ├── PATCH  /:id/read
    ├── POST   /read-all
    └── PUT    /settings
```

### API Best Practices

1. **Versioning**: URL path (`/api/v1/`)
2. **Pagination**: Cursor-based for infinite scroll, offset for admin
   ```json
   {
     "data": [...],
     "pagination": {
       "cursor": "abc123",
       "has_more": true,
       "total": 150
     }
   }
   ```
3. **Consistent Response Format**:
   ```json
   {
     "success": true,
     "data": {...},
     "meta": {
       "timestamp": "2025-01-01T00:00:00Z",
       "request_id": "uuid"
     }
   }
   ```
4. **Error Format**:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid input",
       "details": [{ "field": "email", "message": "Invalid format" }]
     }
   }
   ```

### Rate Limiting Strategy

| Tier | Requests/min | Use Case |
|------|-------------|----------|
| Anonymous | 30 | Public endpoints |
| Free User | 100 | Logged-in free tier |
| Paid User | 300 | Premium subscribers |
| Burst | 500 | Short bursts allowed |

Implementation: Redis token bucket via `@nestjs/throttler`

---

## 5. Security Architecture

### Authentication Flow

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  Client  │──────>│ API GW   │──────>│  NestJS  │
└──────────┘       └──────────┘       └──────────┘
     │                                      │
     │  1. Login (email/OAuth)             │
     │<────────────────────────────────────│
     │     { access_token, refresh_token } │
     │                                      │
     │  2. API Request + Bearer token       │
     │─────────────────────────────────────>│
     │                                      │
     │  3. Response                         │
     │<─────────────────────────────────────│
```

### JWT Configuration

```typescript
// Token structure
interface JwtPayload {
  sub: string;        // user UUID
  email: string;
  role: 'free' | 'premium' | 'admin';
  iat: number;
  exp: number;
}

// Token lifetimes
ACCESS_TOKEN_TTL = '15m'   // Short-lived
REFRESH_TOKEN_TTL = '7d'   // Stored in Redis, rotatable
```

### Security Measures

| Measure | Implementation |
|---------|---------------|
| **Password hashing** | Argon2id (memory-hard) |
| **JWT signing** | RS256 (asymmetric) |
| **Token storage** | HTTP-only cookies (web), Keychain/Keystore (mobile) |
| **Refresh rotation** | New refresh token on each use |
| **Data encryption** | AES-256 for PII at rest |
| **Transport** | TLS 1.3 only |
| **CORS** | Whitelist specific origins |
| **Input validation** | class-validator + class-transformer |
| **SQL injection** | Parameterized queries (TypeORM) |
| **Rate limiting** | Redis token bucket |
| **CSRF protection** | Same-site cookies + token validation |

### Authorization (RBAC)

```typescript
enum Role {
  FREE = 'free',
  PREMIUM = 'premium',
  ADMIN = 'admin'
}

// Guard decorator
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PREMIUM)
@Get('premium-content')
getPremiumContent() {}
```

### OAuth2 Flow (AWS Cognito)

```
1. User clicks "Sign in with Google"
2. Redirect to Cognito hosted UI
3. Cognito handles OAuth with Google
4. Callback to app with authorization code
5. Exchange code for tokens
6. Create/update user in database
7. Issue app JWT tokens
```

---

## 6. Error Handling Strategy

### Error Classification

| Category | HTTP Code | Example |
|----------|-----------|---------|
| Validation | 400 | Invalid email format |
| Authentication | 401 | Expired token |
| Authorization | 403 | Free user accessing premium |
| Not Found | 404 | Resource doesn't exist |
| Conflict | 409 | Duplicate email |
| Rate Limited | 429 | Too many requests |
| Server Error | 500 | Unexpected failure |

### Global Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const { status, message, code } = this.normalizeException(exception);

    // Log to CloudWatch (sanitized - no PII)
    this.logger.error({
      code,
      message,
      stack: exception.stack,
      requestId: ctx.getRequest().id
    });

    response.status(status).json({
      success: false,
      error: { code, message }
    });
  }
}
```

### Client-Friendly Error Codes

```typescript
enum ErrorCode {
  // Auth
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_INSUFFICIENT_ROLE = 'AUTH_003',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_004',

  // Fasting
  FASTING_SESSION_ACTIVE = 'FAST_001',
  FASTING_INVALID_PROTOCOL = 'FAST_002',
  FASTING_SESSION_NOT_FOUND = 'FAST_003',

  // User
  USER_NOT_FOUND = 'USER_001',
  USER_EMAIL_EXISTS = 'USER_002',

  // General
  VALIDATION_ERROR = 'VAL_001',
  RESOURCE_NOT_FOUND = 'RES_001',
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  INTERNAL_ERROR = 'INT_001',
}
```

---

## 7. External Integrations

### Wearable Data (Phase 2)

| Platform | Integration Method |
|----------|-------------------|
| Apple HealthKit | On-device SDK, background sync via mobile app |
| Google Fit | REST API + OAuth2, server-side sync |

**Abstraction Layer:**
```typescript
interface HealthDataProvider {
  getSteps(userId: string, dateRange: DateRange): Promise<StepData[]>;
  getHeartRate(userId: string, dateRange: DateRange): Promise<HeartRateData[]>;
  getSleep(userId: string, dateRange: DateRange): Promise<SleepData[]>;
  getWorkouts(userId: string, dateRange: DateRange): Promise<WorkoutData[]>;
}

// Implementations: HealthKitProvider, GoogleFitProvider
class HealthDataService {
  async syncUserHealth(userId: string, provider: 'healthkit' | 'google_fit') {
    const healthProvider = this.getProvider(provider);
    const data = await healthProvider.getSteps(userId, last24Hours);
    await this.progressMetricsRepository.bulkInsert(data);
  }
}
```

### Social OAuth (MVP)

```
AWS Cognito User Pool
├── Google OAuth 2.0
├── Facebook OAuth 2.0
├── Apple Sign In (iOS requirement)
└── Email/Password (with MFA option)
```

### Payment Integration (Phase 2)

- **Stripe** for subscriptions
- Webhook-driven status updates
- Idempotent payment processing
- Handle subscription lifecycle events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### Barcode Scanning (Phase 2)

- **Open Food Facts API** (free, open-source database)
- Cache responses in Redis (24h TTL)
- Fallback to manual entry

```typescript
@Get('barcode/:code')
async getProductByBarcode(@Param('code') barcode: string) {
  // Check cache first
  const cached = await this.redis.get(`barcode:${barcode}`);
  if (cached) return JSON.parse(cached);

  // Fetch from Open Food Facts
  const product = await this.openFoodFacts.getProduct(barcode);

  // Cache for 24 hours
  await this.redis.setex(`barcode:${barcode}`, 86400, JSON.stringify(product));

  return product;
}
```

### Push Notifications

- **Firebase Cloud Messaging (FCM)** for cross-platform
- Store device tokens per user
- Notification types: fasting reminders, workout reminders, achievements

---

## 8. Real-Time Features (Phase 2)

### WebSocket Architecture

```
┌─────────────┐     ┌───────────────┐     ┌─────────┐
│   Clients   │────>│ Socket.IO GW  │────>│  Redis  │
│  (Mobile)   │<────│   (NestJS)    │<────│ Pub/Sub │
└─────────────┘     └───────────────┘     └─────────┘
```

**Use Cases:**
- Fasting timer sync across devices
- Real-time notification delivery
- Future: real-time chat (Phase 3)
- Live workout sessions with other users (Phase 3)

### WebSocket Events

```typescript
// Server -> Client
interface ServerEvents {
  'fasting:tick': { remaining_seconds: number };
  'fasting:completed': { session_id: string };
  'notification:new': { notification: Notification };
  'sync:progress': { metrics: ProgressMetric[] };
}

// Client -> Server
interface ClientEvents {
  'fasting:start': { protocol_id: string };
  'fasting:end': { session_id: string };
  'notification:read': { notification_id: string };
}
```

---

## 9. Project Structure

```
ugoki-backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── throttle.guard.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── utils/
│   │       ├── pagination.util.ts
│   │       └── date.util.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── aws.config.ts
│   │   ├── redis.config.ts
│   │   └── app.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-refresh.strategy.ts
│   │   │   │   └── cognito.strategy.ts
│   │   │   ├── guards/
│   │   │   │   └── cognito-auth.guard.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       └── refresh-token.dto.ts
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── user-profile.entity.ts
│   │   │   │   └── subscription.entity.ts
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts
│   │   │   └── dto/
│   │   │       ├── update-profile.dto.ts
│   │   │       └── user-preferences.dto.ts
│   │   ├── fasting/
│   │   │   ├── fasting.module.ts
│   │   │   ├── fasting.controller.ts
│   │   │   ├── fasting.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── fasting-session.entity.ts
│   │   │   │   └── fasting-protocol.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-session.dto.ts
│   │   │       └── end-session.dto.ts
│   │   ├── workout/
│   │   │   ├── workout.module.ts
│   │   │   ├── workout.controller.ts
│   │   │   ├── workout.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── exercise.entity.ts
│   │   │   │   ├── workout-routine.entity.ts
│   │   │   │   └── workout-session.entity.ts
│   │   │   └── dto/
│   │   ├── nutrition/
│   │   │   ├── nutrition.module.ts
│   │   │   ├── nutrition.controller.ts
│   │   │   ├── nutrition.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── recipe.entity.ts
│   │   │   │   ├── meal-plan.entity.ts
│   │   │   │   └── meal-log.entity.ts
│   │   │   └── dto/
│   │   ├── content/
│   │   │   ├── content.module.ts
│   │   │   ├── content.controller.ts
│   │   │   ├── content.service.ts
│   │   │   └── entities/
│   │   │       └── article.entity.ts
│   │   ├── analytics/
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── entities/
│   │   │       └── progress-metric.entity.ts
│   │   └── notification/
│   │       ├── notification.module.ts
│   │       ├── notification.controller.ts
│   │       ├── notification.service.ts
│   │       ├── notification.gateway.ts (WebSocket)
│   │       └── entities/
│   │           └── notification.entity.ts
│   └── database/
│       ├── migrations/
│       │   ├── 001-create-users.ts
│       │   ├── 002-create-profiles.ts
│       │   └── ...
│       └── seeds/
│           ├── fasting-protocols.seed.ts
│           └── exercises.seed.ts
├── test/
│   ├── unit/
│   │   └── modules/
│   └── e2e/
│       └── auth.e2e-spec.ts
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── docker-compose.yml
├── .env.example
├── .env.development
├── .env.production
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── README.md
```

---

## 10. MVP Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project scaffolding (NestJS, TypeORM, PostgreSQL)
- [ ] Database schema + migrations
- [ ] Auth module (JWT + Cognito OAuth)
- [ ] User module (profiles, preferences, onboarding)
- [ ] Basic CI/CD (GitHub Actions → ECS)
- [ ] Docker setup for local development
- [ ] Environment configuration

### Phase 2: Core Features (Weeks 5-8)
- [ ] Fasting module (protocols, sessions, timers)
- [ ] Workout module (exercise library, HIIT routines)
- [ ] Nutrition module (meal plans, recipes)
- [ ] Analytics module (progress tracking, dashboards)
- [ ] TimescaleDB integration for metrics

### Phase 3: Content & Polish (Weeks 9-10)
- [ ] Content module (articles, research library)
- [ ] Notification module (push + email via SES)
- [ ] Admin endpoints for content management
- [ ] Rate limiting implementation
- [ ] Load testing + query optimization

### Phase 4: Launch Prep (Weeks 11-12)
- [ ] Security audit
- [ ] Performance optimization
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Staging environment validation
- [ ] Monitoring dashboards (CloudWatch)
- [ ] Error tracking (Sentry integration)

---

## 11. Scalability Evolution Path

When exceeding 10K users:

1. **Extract Analytics to microservice** (highest load module)
2. **Add read replicas** for PostgreSQL
3. **Implement caching layer** more aggressively
4. **Add Kafka** for event streaming between services
5. **Shard PostgreSQL** by user_id hash
6. **Implement CQRS** for write-heavy modules
7. **Add CDN caching** for content/media

### Microservices Extraction Order
1. Analytics Service (independent, read-heavy)
2. Notification Service (async, external integrations)
3. Content Service (cacheable, CDN-friendly)
4. Core remains as User + Auth + Fasting + Workout + Nutrition

---

## 12. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| CloudWatch Logs | Application logs (structured JSON) |
| CloudWatch Metrics | Custom business metrics |
| X-Ray | Distributed tracing |
| Sentry | Error tracking + alerting |
| CloudWatch Alarms | Threshold-based alerts |

### Key Metrics to Track

**Technical:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Cache hit/miss rates
- Memory/CPU utilization

**Business:**
- Daily Active Users (DAU)
- Active fasting sessions
- Workout completion rate
- User retention (D1, D7, D30)
- Free → Premium conversion

### Logging Strategy

```typescript
// Structured logging format
{
  "timestamp": "2025-01-01T00:00:00Z",
  "level": "info",
  "message": "User logged in",
  "context": "AuthService",
  "requestId": "uuid",
  "userId": "uuid",
  "duration_ms": 45
}
```

---

## 13. Decision Rationale Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | NestJS | TypeScript-first, modular, excellent WebSocket support |
| Primary DB | PostgreSQL | ACID compliance, JSONB flexibility, mature ecosystem |
| Time-series | TimescaleDB | 169% better write performance than MongoDB for metrics |
| Cache | Redis | Sessions, rate limiting, pub/sub, proven reliability |
| Architecture | Modular monolith | MVP speed with clear microservices evolution path |
| Auth | JWT + RS256 | Stateless, secure, industry standard |
| Cloud | AWS | Best managed services variety, team expertise |
| API style | REST | Simpler for mobile, well-cached, predictable |
| Password hash | Argon2id | Memory-hard, OWASP recommended |
| Container | ECS Fargate | Serverless containers, no EC2 management |

---

## 14. Cost Estimation (MVP - Monthly)

| Service | Estimated Cost |
|---------|---------------|
| ECS Fargate (2 tasks) | ~$50-80 |
| RDS PostgreSQL (db.t3.medium) | ~$60-80 |
| ElastiCache Redis (cache.t3.micro) | ~$15-25 |
| S3 (10GB) | ~$5 |
| CloudFront | ~$10-20 |
| Cognito (10K users) | Free tier |
| **Total** | **~$140-210/month** |

---

## Sources & References

- [Mobile App Backend Development 2025](https://wezom.com/blog/mobile-app-backend-development-in-2025)
- [JWT Security Best Practices](https://curity.io/resources/learn/jwt-best-practices/)
- [OAuth 2.0 Security RFC 9700](https://datatracker.ietf.org/doc/rfc9700/)
- [TimescaleDB vs MongoDB Performance](https://www.tigerdata.com/blog/how-to-store-time-series-data-mongodb-vs-timescaledb-postgresql-a73939734016)
- [Event-Driven Architecture: Kafka vs RabbitMQ 2025](https://www.javacodegeeks.com/2025/12/event-driven-architecture-kafka-vs-rabbitmq-vs-pulsar-a-2025-decision-framework.html)
- [Scaling WebSockets with Redis Pub/Sub](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)
- [NestJS Documentation](https://docs.nestjs.com/)
- [PostgreSQL Best Practices](https://www.tigerdata.com/learn/postgresql-database-operations)
