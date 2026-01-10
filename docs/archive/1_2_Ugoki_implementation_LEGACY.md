# UGOKI Implementation Plan: Next Steps for User Feature Integration

**Strategic Roadmap for MVP Development**  
**Version:** 1.0 | December 2025  
**Status:** Pre-Development Planning Phase

---

## Executive Overview

This plan operationalizes the technical analysis findings into concrete development milestones, establishing the foundation for UGOKI's MVP launch. The focus is on creating a user-centric platform that delivers immediate value through IF-HIIT integration while maintaining architectural flexibility for future AI personalization layers.

**Timeline Horizon:** 16-20 weeks to MVP launch  
**Critical Path:** Technology stack finalization → Data architecture → User flows → Development

---

## 1. Finalized MVP Feature Scope

### 1.1 Core MVP Features (Must Have)

**Phase 1: Foundation (Weeks 1-8)**

| Feature | Priority | Complexity | User Value | Dependencies |
|---------|----------|------------|------------|--------------|
| User authentication (OAuth social login + anonymous) | P0 | Medium | Essential access | None |
| Onboarding flow (body type assessment, goals) | P0 | Medium | Personalization foundation | Authentication |
| IF timer with 16/8 protocol | P0 | Low-Medium | Core differentiator | User profile |
| Push notifications (fasting windows, reminders) | P0 | Medium | Habit formation | Timer, permissions |
| Basic progress dashboard | P0 | Medium | Value demonstration | Data collection |
| Weight/BMI tracking | P0 | Low | Measurable outcomes | User input |

**Phase 2: Core Experience (Weeks 9-12)**

| Feature | Priority | Complexity | User Value | Dependencies |
|---------|----------|------------|------------|--------------|
| HIIT workout library (10-20 min sessions) | P0 | High | Secondary pillar | Content creation |
| Workout video player | P0 | Medium | User experience | Video hosting |
| Basic meal suggestions | P0 | Medium | IF complement | Nutrition database |
| Workout completion tracking | P0 | Low | Progress visibility | Dashboard |

**Phase 3: Engagement Loop (Weeks 13-16)**

| Feature | Priority | Complexity | User Value | Dependencies |
|---------|----------|------------|------------|--------------|
| Streak mechanics (fasting, workout consistency) | P0 | Medium | Retention driver | Progress tracking |
| Milestone celebrations | P0 | Low-Medium | Achievement recognition | Data analysis |
| Basic gamification (points, levels) | P0 | Medium | Engagement layer | User activity |

### 1.2 Early Adoption Features (Should Have)

**Post-MVP Priority (Weeks 17-24)**

| Feature | Timeline | Strategic Value | Prerequisites |
|---------|----------|-----------------|---------------|
| Wearable integration (HealthKit/Google Fit) | Week 17-18 | Data depth, market expectation | MVP stable |
| Social follow/interaction system | Week 19-20 | Community foundation | User base critical mass |
| Expanded fasting protocols (24h, 5:2) | Week 19 | User progression | Core timer proven |
| Weekly meal planner | Week 21-22 | Nutrition pillar completion | Meal database expanded |
| Meditation hub | Week 23 | Holistic wellness | Audio content production |
| Barcode scanner | Week 24 | Convenience feature | Camera permissions |

### 1.3 Deferred Features (Could Have)

**Post-Launch Roadmap (Months 6+)**
- AI scheduling agents
- Voice control integration
- Live workout streaming
- Location-based features
- Influencer ecosystem
- Grocery delivery integration

### 1.4 Avatar/Character Growth System

**Status:** Elevated to MVP-critical based on retention analysis

**Implementation Timeline:** Weeks 13-16 (parallel to engagement loop)

**Core Mechanics:**
- Visual character evolution tied to user consistency
- Unlockable customization options through milestone achievements
- Character "health" reflects user fasting adherence
- Progression stages: Beginner → Practitioner → Optimizer → Master

**Rationale:** Progress visibility through avatar gamification has shown 40%+ retention improvement in wellness apps. This transforms abstract health metrics into tangible, emotional progress representation.

---

## 2. Technology Stack Recommendation

### 2.1 Architecture Philosophy

**Principles:**
- Privacy-by-design (GDPR compliance from day one)
- Scalable microservices architecture
- Mobile-first responsive design
- Offline-capable with sync
- Cloud-agnostic where possible

### 2.2 Frontend Stack

**Mobile Applications:**

```
Primary: React Native (iOS + Android)
├── State Management: Redux Toolkit + Redux Persist
├── Navigation: React Navigation v6
├── UI Components: React Native Paper (Material Design)
├── Animations: React Native Reanimated
├── Forms: React Hook Form + Yup validation
├── Date/Time: date-fns
└── Charts/Visualization: Victory Native

Alternative consideration: Flutter (if team has Dart expertise)
```

**Why React Native:**
- Single codebase for iOS/Android (faster MVP)
- Large ecosystem and community
- Hot reload for rapid iteration
- Native module integration for wearables
- Strong TypeScript support

**Web Application (Optional Phase 2):**

```
Framework: Next.js 14+ (App Router)
├── UI Components: shadcn/ui (Radix + Tailwind)
├── State Management: Zustand or React Context
├── API Communication: React Query
├── Forms: React Hook Form
└── Authentication: NextAuth.js
```

### 2.3 Backend Stack

**Core Services Architecture:**

```
API Gateway: Kong or AWS API Gateway
├── Auth Service: Node.js + Passport.js
│   └── Database: PostgreSQL (user credentials)
├── User Service: Node.js (Express or Fastify)
│   └── Database: PostgreSQL (profiles, settings)
├── Fasting Service: Node.js
│   └── Database: PostgreSQL + TimescaleDB (time-series data)
├── Workout Service: Node.js
│   └── Database: PostgreSQL + MongoDB (video metadata)
├── Nutrition Service: Node.js
│   └── Database: PostgreSQL + Redis (caching)
├── Notification Service: Node.js
│   └── Queue: Bull (Redis-backed)
└── Analytics Service: Node.js
    └── Database: TimescaleDB + ClickHouse
```

**Technology Justification:**

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Runtime** | Node.js 20 LTS | JavaScript ecosystem consistency, excellent async I/O, TypeScript support |
| **API Framework** | Fastify | Fastest Node.js framework, schema validation, plugin architecture |
| **Primary Database** | PostgreSQL 16 | ACID compliance, JSON support, mature ecosystem, GDPR compliance features |
| **Time-Series** | TimescaleDB | PostgreSQL extension, optimized for metrics/fasting data |
| **Cache Layer** | Redis 7 | Fast in-memory storage, pub/sub for real-time features |
| **Object Storage** | AWS S3 / CloudFlare R2 | Workout videos, user uploads, cost-effective CDN |
| **Search** | ElasticSearch | Meal/workout content search, user discovery |

### 2.4 Infrastructure & DevOps

**Cloud Platform:**

```
Primary: AWS (recommended) or Google Cloud Platform
├── Compute: ECS Fargate (containerized services)
├── Database: RDS PostgreSQL (Multi-AZ)
├── Cache: ElastiCache Redis
├── Storage: S3 + CloudFront CDN
├── Queue: SQS
├── Monitoring: CloudWatch + DataDog
└── Secrets: AWS Secrets Manager
```

**Alternative for Cost-Conscious MVP:**

```
Platform: Railway.app or Render.com
├── Managed PostgreSQL
├── Container deployment
├── Automatic HTTPS
└── Built-in monitoring
```

**CI/CD Pipeline:**

```
Version Control: GitHub
├── CI: GitHub Actions
├── Testing: Jest + Cypress
├── Container Registry: Docker Hub / AWS ECR
├── Deployment: Automated via GitHub Actions
└── Environments: Dev → Staging → Production
```

### 2.5 Authentication & Security

```
Authentication Strategy:
├── OAuth 2.0 Providers: Google, Apple, Facebook
├── Anonymous Mode: Temporary token-based access
├── Session Management: JWT (access) + Refresh tokens
├── Password Security: Argon2 hashing
└── Rate Limiting: Express-rate-limit

Security Stack:
├── TLS: 1.3 minimum
├── CORS: Strict origin policies
├── Helmet.js: Security headers
├── OWASP validation
└── Audit logging: Winston + AWS CloudWatch
```

### 2.6 AI/ML Infrastructure (Post-MVP)

```
Phase 1 (MVP): Rule-based recommendations
└── Implementation: Business logic in backend services

Phase 2 (Months 3-6): Basic ML
├── Recommendation Engine: AWS Personalize
├── Content Filtering: Python scikit-learn
└── Deployment: AWS SageMaker

Phase 3 (Months 6+): Advanced personalization
├── LLM Integration: Claude API (Anthropic)
├── Custom Models: TensorFlow/PyTorch
├── Vector Database: Pinecone (meal/workout similarity)
└── Feature Store: Feast
```

### 2.7 Third-Party Integrations

| Service | Purpose | Priority | Complexity |
|---------|---------|----------|------------|
| **Stripe** | Subscription payments | MVP | Low |
| **Twilio/SendGrid** | Email/SMS notifications | MVP | Low |
| **Firebase Cloud Messaging** | Push notifications | MVP | Medium |
| **HealthKit** (iOS) | Wearable data sync | Post-MVP | High |
| **Google Fit** (Android) | Wearable data sync | Post-MVP | High |
| **Nutritionix API** | Food database | MVP | Low |
| **Sentry** | Error tracking | MVP | Low |
| **Mixpanel/Amplitude** | Product analytics | MVP | Medium |

### 2.8 Data Privacy & GDPR Compliance Stack

```
Privacy Architecture:
├── Data Regionalization: EU data in EU region (AWS Frankfurt/Ireland)
├── Encryption at Rest: AES-256 (database level)
├── Encryption in Transit: TLS 1.3
├── PII Masking: Automated field-level encryption
├── Right to Erasure: Automated deletion workflows
├── Data Export: Automated user data export API
└── Consent Management: Custom consent tracking system

GDPR Tooling:
├── Cookie Consent: OneTrust or custom solution
├── Data Mapping: Custom data lineage tracking
├── Audit Logs: Immutable log storage (S3 Glacier)
└── DPA Generation: Automated document templates
```

---

## 3. User Flow Design & User-First Approach

### 3.1 Core User Journey Architecture

**Design Philosophy:**
- **Progressive disclosure:** Show complexity gradually as user advances
- **Micro-commitments:** Small actions leading to habit formation
- **Instant feedback:** Immediate response to every user action
- **Friction reduction:** Minimize steps to core value (fasting timer)

### 3.2 Primary User Flows

#### Flow 1: First-Time User Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│                    LANDING SCREEN                               │
│  • Value proposition headline                                   │
│  • 3 key benefits visualization                                 │
│  • Social proof (testimonials/stats)                            │
│  • CTA: "Start Your Journey" / "Try Anonymous Mode"            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│               AUTHENTICATION CHOICE                             │
│  Option 1: Continue with [Google/Apple/Facebook]               │
│  Option 2: Try Anonymous Mode (30-day trial)                   │
│  • Privacy messaging: "Your health data is yours"              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│              GOAL ASSESSMENT (Step 1/4)                        │
│  "What brings you to UGOKI?"                                    │
│  ☐ Weight management                                            │
│  ☐ Increase energy levels                                       │
│  ☐ Build muscle/strength                                        │
│  ☐ Improve metabolic health                                     │
│  ☐ Develop sustainable habits                                   │
│  • Allow multiple selections                                    │
│  • Progress indicator: 25% complete                             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│              BODY TYPE ASSESSMENT (Step 2/4)                   │
│  "Help us personalize your experience"                          │
│  • Visual body type selector (ectomorph/mesomorph/endomorph)   │
│  • Current fitness level: Beginner/Intermediate/Advanced       │
│  • Input: Height, current weight, target weight               │
│  • Progress indicator: 50% complete                             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│         FASTING EXPERIENCE ASSESSMENT (Step 3/4)               │
│  "Have you tried intermittent fasting before?"                  │
│  ○ Never tried → Recommend 16/8 with gradual transition        │
│  ○ Tried but stopped → Understand blockers, offer support      │
│  ○ Currently practicing → Match to existing protocol           │
│  • Progress indicator: 75% complete                             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│           SCHEDULE PERSONALIZATION (Step 4/4)                  │
│  "When can you commit 15-20 minutes daily?"                     │
│  • Morning / Afternoon / Evening preference                     │
│  • Workout timing relative to fasting window                    │
│  • Notification preferences setup                               │
│  • Progress indicator: 100% complete                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│               PERSONALIZED PLAN REVEAL                          │
│  "Your Optimized Plan is Ready!"                                │
│  • Visual summary of recommended protocol                       │
│  • First week expectations                                      │
│  • Avatar character introduction (Level 1)                      │
│  • CTA: "Start First Fast" (high-energy button)                │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   HOME DASHBOARD                                │
│  (User enters core experience loop)                             │
└─────────────────────────────────────────────────────────────────┘
```

**Design Decisions:**

| Element | Decision | Rationale |
|---------|----------|-----------|
| Onboarding Length | 4 steps maximum | Completion rates drop significantly after 4 screens |
| Anonymous Option | Upfront choice | Reduces signup friction, allows trial before commitment |
| Progress Indicator | Visible at all steps | Reduces abandonment through goal-gradient effect |
| Personal Data | Minimal initially | GDPR compliance, trust building |
| Value Demonstration | Before signup | 40% higher conversion when users see value first |

#### Flow 2: Daily Active User Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOME DASHBOARD                               │
│                                                                 │
│  Avatar Status:  [Character visual] Level 3 - Practitioner      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Fasting Timer: 12:34:12 / 16:00:00                       │ │
│  │  [Visual progress ring]                                    │ │
│  │  Status: FASTING  💧 Stay hydrated!                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Today's Goals: [2/3 Complete]                                  │
│  ✓ Complete 16-hour fast                                        │
│  ✓ Log weight                                                   │
│  ☐ Complete HIIT workout (15 min)                              │
│                                                                 │
│  Quick Actions:                                                 │
│  [Start Workout] [Log Meal] [View Progress]                   │
│                                                                 │
│  Streak: 🔥 7 days | Next Milestone: 14 days (7 days away)     │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (User taps Start Workout)
┌─────────────────────────────────────────────────────────────────┐
│               WORKOUT SELECTION                                 │
│  Recommended for You:                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Full Body HIIT - 15 min  [Best for fasted workouts]     │  │
│  │ Difficulty: ●●○○○                                        │  │
│  │ Equipment: None                                          │  │
│  │ [START] ────────────────────────────────────────────────  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Other Options:                                                 │
│  • Upper Body Focus - 12 min                                    │
│  • Core Strength - 10 min                                       │
│  • Low Impact Cardio - 20 min                                   │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (User starts workout)
┌─────────────────────────────────────────────────────────────────┐
│                WORKOUT IN PROGRESS                              │
│  Exercise 2/8: Jumping Jacks                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         [Video Player]                                     │ │
│  │      Instructor demonstrating                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Time Remaining: 00:35                                          │
│  [Pause] [Next Exercise] [Skip]                                │
│                                                                 │
│  Circuit Progress: ████████░░ 60%                               │
│  Calories Burned (est.): 87 kcal                                │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (Workout completed)
┌─────────────────────────────────────────────────────────────────┐
│              WORKOUT COMPLETION CELEBRATION                     │
│  🎉 Awesome Work! 🎉                                            │
│                                                                 │
│  [Avatar levels up animation]                                   │
│  Your character gained 50 XP!                                   │
│                                                                 │
│  Today's Workout: Full Body HIIT                                │
│  Duration: 15:23                                                │
│  Est. Calories: 142 kcal                                        │
│                                                                 │
│  Streak maintained: 🔥 7 days                                   │
│  [Share Achievement] [Done]                                     │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (Returns to dashboard)
┌─────────────────────────────────────────────────────────────────┐
│                HOME DASHBOARD (Updated)                         │
│  Today's Goals: [3/3 Complete] ✨                               │
│  ✓ Complete 16-hour fast                                        │
│  ✓ Log weight                                                   │
│  ✓ Complete HIIT workout                                        │
│                                                                 │
│  Perfect Day Bonus: +100 XP                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Flow Optimization Principles:**

1. **Minimal Taps to Value:** Core actions (start fast, start workout) accessible in 2 taps maximum
2. **Contextual Recommendations:** Workout suggestions adapt to fasting state (fasted vs. fed)
3. **Progressive Motivation:** Escalating celebration intensity as streaks build
4. **Friction Points Identified:**
   - Video loading delays → Implement progressive streaming + preloading
   - Workout abandonment → Add pause capability, not just quit
   - Notification fatigue → Intelligent timing based on usage patterns

#### Flow 3: Progress Review & Insight Discovery

```
┌─────────────────────────────────────────────────────────────────┐
│                  PROGRESS DASHBOARD                             │
│  [Tab Navigation: Overview | Fasting | Workouts | Nutrition]   │
│                                                                 │
│  ═══════════════ OVERVIEW TAB ═══════════════                  │
│                                                                 │
│  Your Journey: Day 21                                           │
│  [Avatar character - Level 5 - Advanced Practitioner]           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Weekly Consistency Score: 89%  ⬆️ +12% vs last week     │  │
│  │  [Circular progress visualization]                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Key Metrics (Last 7 Days):                                     │
│  • Fasting adherence: 6/7 days                                  │
│  • Workouts completed: 5/7 days                                 │
│  • Weight change: -1.2 kg ↓                                     │
│  • Streak: 21 days 🔥                                           │
│                                                                 │
│  Insights:                                                      │
│  💡 Your workout consistency is highest on Mondays & Thursdays  │
│  💡 Fasting becomes easier after day 3 of your weekly cycle     │
│                                                                 │
│  [View Detailed Stats] [Share Progress]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Progressive Disclosure Strategy:**

- **Week 1:** Basic metrics only (fast completion, workouts)
- **Week 2-4:** Add trend visualizations
- **Month 2+:** Introduce behavioral insights and pattern recognition
- **Month 3+:** Comparative analytics (you vs. similar users)

### 3.3 Critical User Experience Decisions

#### Decision Matrix: Core UX Trade-offs

| Feature | User Benefit | Implementation Complexity | MVP Decision |
|---------|-------------|---------------------------|--------------|
| **Offline mode for timer** | Continue fasting tracking without connection | High (sync conflicts) | ✅ MVP - Critical for reliability |
| **Video download for workouts** | Exercise without data usage | High (storage, licensing) | ❌ Post-MVP - WiFi-only notice acceptable |
| **Real-time social features** | Community connection | High (infrastructure) | ❌ Post-MVP - Async community sufficient initially |
| **Biometric login** | Convenience, security | Medium (platform APIs) | ✅ MVP - Industry standard |
| **Dark mode** | Accessibility, preference | Low (theme system) | ✅ MVP - High user expectation |
| **Multi-language** | Market expansion | High (translation, testing) | ❌ Post-MVP - Launch English-only |

#### Accessibility Compliance

**WCAG 2.1 Level AA Requirements:**

| Requirement | Implementation | Priority |
|-------------|----------------|----------|
| **Color contrast** | 4.5:1 minimum for text | MVP |
| **Touch targets** | 44x44pt minimum size | MVP |
| **Screen reader support** | Semantic HTML, ARIA labels | MVP |
| **Keyboard navigation** | Full app navigable without touch | Post-MVP (web) |
| **Text scaling** | Support 200% scaling | MVP |
| **Reduced motion** | Respect OS animation preferences | MVP |

---

## 4. User Research Plan: IF-HIIT Integration Validation

### 4.1 Research Objectives

**Primary Question:**  
Does the integrated IF-HIIT positioning resonate with busy professionals as a differentiated value proposition?

**Secondary Questions:**
1. Do users perceive the 15-20 minute commitment as achievable?
2. What are the primary blockers to fasting adoption?
3. How important is workout timing flexibility relative to fasting windows?
4. What role does community/social features play in sustained engagement?
5. Do users trust AI-driven recommendations vs. static plans?

### 4.2 Research Methodology

#### Phase 1: Qualitative Discovery (Weeks 1-2)

**Method:** In-depth User Interviews  
**Sample Size:** 15-20 participants  
**Participant Profile:**
- Age: 28-45
- Occupation: Professional roles (office-based, remote-capable)
- Current state: Attempted wellness apps/programs in past 12 months
- Mix: 40% currently using fasting apps, 60% fitness-curious but inconsistent

**Interview Protocol (45 minutes):**

```
Part 1: Current State Exploration (10 min)
• Typical daily schedule walkthrough
• Current wellness habits and tools
• Pain points with existing solutions
• Abandoned apps/programs and why

Part 2: Concept Exposure (15 min)
• UGOKI value proposition presentation
• Reaction to IF-HIIT integration concept
• Perceived benefits vs. concerns
• Pricing sensitivity discussion

Part 3: Feature Prioritization (10 min)
• Card sorting exercise: Must-have vs. nice-to-have features
• Scenario-based questions: How would you use X feature?
• Competition: What would make you switch from current solution?

Part 4: Usability Preview (10 min)
• Onboarding flow walkthrough (wireframes)
• First impressions of UI direction
• Friction points identification
```

**Analysis Framework:**
- Thematic coding for recurring pain points
- Jobs-to-be-done mapping
- Competitive force analysis (what keeps users with current solutions)

#### Phase 2: Quantitative Validation (Weeks 3-4)

**Method:** Online Survey + Landing Page Test  
**Sample Size:** 300-500 respondents  
**Distribution:** Social media ads, wellness forums, professional networks

**Survey Structure:**

```
Section 1: Demographic & Psychographic Profiling
• Age, occupation, income bracket
• Current wellness app usage
• Self-assessed fitness level
• Motivation archetypes (health, aesthetics, performance, longevity)

Section 2: Value Proposition Testing (A/B split)
Group A: IF-HIIT integrated messaging
Group B: Separate IF and HIIT messaging
• Measure: Interest rating (1-5 scale)
• Likelihood to download (1-5 scale)

Section 3: Feature Importance Ranking
• MaxDiff analysis: Force ranking of 12 feature pairs
• Identifies relative importance objectively

Section 4: Pricing & Willingness-to-Pay
• Van Westendorp Price Sensitivity Meter
• Ranges: £4.99 - £19.99/month
• Freemium vs. premium feature allocation preferences

Section 5: Competitive Landscape Perception
• Current app NPS scores
• Switching barriers identification
• UGOKI differentiation perception check
```

**Landing Page Experiment:**

```
Setup:
• 3 landing page variants with different messaging angles
  Variant A: "Optimize Your Life in 15 Minutes Daily"
  Variant B: "IF-HIIT Integration for Busy Professionals"
  Variant C: "Transform Your Health Without Sacrificing Your Career"
• CTA: "Join Early Access Waitlist"
• Track: Bounce rate, time on page, conversion rate

Metrics:
• Primary: Email signup conversion rate
• Secondary: Page engagement (scroll depth, video watch time)
• Qualitative: Exit survey for non-converters
```

#### Phase 3: Prototype Usability Testing (Weeks 5-6)

**Method:** Moderated Remote Usability Tests  
**Sample Size:** 12-15 participants (mix of interview and new participants)  
**Tool:** Interactive Figma prototype

**Task Scenarios:**

1. **Onboarding Completion:** "You've decided to try UGOKI. Complete the signup and setup process."
   - Success metric: Completion without assistance
   - Measure: Time to complete, friction points, error recovery

2. **First Fast Initiation:** "Start your first 16-hour fast."
   - Success metric: Timer started correctly
   - Measure: Clarity of instructions, confidence level

3. **Workout Discovery:** "Find a workout suitable for fasting state."
   - Success metric: Appropriate workout selected
   - Measure: Navigation efficiency, filtering comprehension

4. **Progress Review:** "Check your progress from the past week."
   - Success metric: Locates and interprets dashboard
   - Measure: Data comprehension, insight actionability

**Observation Protocol:**
- Think-aloud narration
- Emotion tracking (frustration, delight moments)
- Post-task confidence ratings
- System Usability Scale (SUS) survey

### 4.3 Success Criteria & Decision Gates

**Go/No-Go Criteria for MVP Development:**

| Metric | Target | Implication if Missed |
|--------|--------|------------------------|
| **Value proposition resonance** | 70%+ "very interested" | Revise core messaging |
| **Perceived achievability** | 80%+ believe they can commit 15-20 min | Reduce time commitment messaging |
| **Feature set alignment** | 85%+ of MVP features rated "important/critical" | Reprioritize feature scope |
| **Onboarding completion (prototype)** | 90%+ complete without major blockers | Simplify onboarding flow |
| **Differentiation perception** | 60%+ see clear difference from competitors | Strengthen unique positioning |
| **Pricing acceptance** | Median WTP ≥ £9.99/month | Adjust monetization strategy |

**Pivot Indicators:**
- If IF-HIIT integration tests worse than separate features → Reconsider positioning
- If workout timing flexibility is top concern → Prioritize "anytime HIIT" library
- If community features rate higher than expected → Accelerate social feature roadmap

### 4.4 Research Timeline & Resource Requirements

```
Week 1-2:  Participant recruitment & interview scheduling
           ├── Leverage: Wellness communities, professional networks
           └── Incentive: £30 Amazon voucher per interview

Week 3:    Interview execution (15-20 sessions)
           ├── Tools: Zoom recording, Otter.ai transcription
           └── Team: 1 researcher + 1 note-taker

Week 4:    Thematic analysis & insight synthesis
           └── Output: Research findings deck

Week 5:    Survey design & landing page development
           ├── Tools: Typeform, Webflow/Framer
           └── Ad budget: £1,500-2,000 (Facebook, LinkedIn ads)

Week 6:    Survey deployment & data collection
           └── Target: 300+ complete responses

Week 7:    Prototype usability testing
           ├── Tools: Figma, Maze.design for remote testing
           └── Incentive: £40 per 60-minute session

Week 8:    Final analysis & recommendations
           └── Output: Research summary + feature prioritization updates
```

**Budget Estimate:**
- Interview incentives: £450-600
- Survey incentives + ad spend: £2,000-2,500
- Usability test incentives: £480-600
- Tools/software: £500
- **Total: £3,430-4,200**

---

## 5. Detailed Data Model (Privacy-by-Design)

### 5.1 Data Architecture Principles

**Privacy-by-Design Framework:**

1. **Data Minimization:** Collect only data essential for feature functionality
2. **Purpose Limitation:** Data used exclusively for stated purposes
3. **Storage Limitation:** Retention policies with automated deletion
4. **Pseudonymization:** User data separated from personally identifiable information
5. **Encryption Standards:** AES-256 at rest, TLS 1.3 in transit
6. **Right to Erasure:** Complete data deletion workflows within 30 days
7. **Data Portability:** Standardized export format (JSON)

### 5.2 Core Data Entities

#### Entity 1: User Account

```sql
-- Primary user identity and authentication
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, deleted
    account_type VARCHAR(20) NOT NULL, -- authenticated, anonymous
    email_hash VARCHAR(64), -- SHA-256 hash, not stored plaintext
    auth_provider VARCHAR(50), -- google, apple, facebook, anonymous
    auth_provider_id VARCHAR(255), -- External provider user ID
    last_login TIMESTAMP,
    timezone VARCHAR(50),
    locale VARCHAR(10) DEFAULT 'en-GB',
    
    -- GDPR compliance fields
    consent_marketing BOOLEAN DEFAULT false,
    consent_analytics BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMP,
    data_retention_override INTERVAL, -- User-specified retention period
    
    -- Security
    failed_login_attempts INT DEFAULT 0,
    account_locked_until TIMESTAMP,
    
    CONSTRAINT check_account_status CHECK (account_status IN ('active', 'suspended', 'deleted', 'pending_deletion'))
);

-- Indexes
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_email_hash ON users(email_hash) WHERE account_type = 'authenticated';
```

**Design Decisions:**
- Email stored as hash, not plaintext (prevents PII exposure in database dumps)
- `auth_provider_id` stored separately from email for OAuth users
- Anonymous accounts have limited lifespan (30 days without conversion)
- Soft delete with `deleted` status before permanent removal

#### Entity 2: User Profile (PII Separated)

```sql
-- Non-identifying personal preferences
CREATE TABLE user_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Physical attributes (pseudonymized storage)
    date_of_birth_encrypted BYTEA, -- AES-256 encrypted
    gender VARCHAR(20), -- self-identified, optional
    height_cm DECIMAL(5,2),
    
    -- Fitness assessment
    body_type VARCHAR(20), -- ectomorph, mesomorph, endomorph
    fitness_level VARCHAR(20), -- beginner, intermediate, advanced
    activity_multiplier DECIMAL(3,2) DEFAULT 1.2, -- TDEE calculation
    
    -- Goals and preferences
    primary_goals JSONB, -- Array of goal IDs
    dietary_preferences JSONB, -- vegetarian, vegan, keto, etc.
    workout_time_preference VARCHAR(20), -- morning, afternoon, evening
    notification_preferences JSONB,
    
    -- Avatar/gamification
    avatar_id VARCHAR(50),
    avatar_level INT DEFAULT 1,
    total_xp INT DEFAULT 0,
    
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_profile_user ON user_profiles(user_id);
CREATE INDEX idx_profile_fitness_level ON user_profiles(fitness_level);
CREATE INDEX idx_profile_goals ON user_profiles USING GIN (primary_goals);
```

**Design Decisions:**
- Date of birth encrypted (age calculations done in application layer)
- Goals stored as JSONB array for flexibility
- Avatar state stored here for quick access (denormalized)
- No direct foreign keys to external PII tables

#### Entity 3: Fasting Sessions (Time-Series)

```sql
-- Fasting timer events and history (TimescaleDB hypertable)
CREATE TABLE fasting_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    protocol_type VARCHAR(20) NOT NULL, -- 16-8, 24h, 5-2, custom
    started_at TIMESTAMP NOT NULL,
    scheduled_end_at TIMESTAMP NOT NULL,
    actual_ended_at TIMESTAMP, -- NULL if in progress
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, abandoned
    
    -- Metrics
    duration_hours DECIMAL(5,2),
    adherence_percentage DECIMAL(5,2),
    
    -- Context
    break_reason VARCHAR(50), -- scheduled, early_break, abandoned
    user_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_status CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('fasting_sessions', 'started_at', 
    chunk_time_interval => INTERVAL '1 month');

-- Indexes
CREATE INDEX idx_fasting_user_time ON fasting_sessions(user_id, started_at DESC);
CREATE INDEX idx_fasting_status ON fasting_sessions(user_id, status);
CREATE INDEX idx_fasting_protocol ON fasting_sessions(protocol_type);

-- Continuous aggregate for streak calculation
CREATE MATERIALIZED VIEW fasting_daily_summary
WITH (timescaledb.continuous) AS
SELECT user_id,
       time_bucket('1 day', started_at) AS day,
       COUNT(*) as sessions_count,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
       AVG(adherence_percentage) as avg_adherence
FROM fasting_sessions
GROUP BY user_id, time_bucket('1 day', started_at);
```

**Design Decisions:**
- TimescaleDB hypertable for efficient time-series queries
- Continuous aggregate for real-time streak calculations
- User notes stored separately from structured data
- Adherence percentage calculated: (actual_duration / scheduled_duration) * 100

#### Entity 4: Workouts and Activity

```sql
-- Workout catalog (content)
CREATE TABLE workout_library (
    workout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    difficulty_level INT CHECK (difficulty_level BETWEEN 1 AND 5),
    workout_type VARCHAR(50), -- hiit, strength, cardio, mobility
    equipment_required JSONB DEFAULT '[]', -- Array of equipment IDs
    body_focus JSONB, -- Array: full-body, upper, lower, core
    
    -- Content references
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    instructor_name VARCHAR(100),
    
    -- Metadata
    calories_estimate_range JSONB, -- {min: 100, max: 200}
    suitable_for_fasting BOOLEAN DEFAULT true,
    
    -- Accessibility
    modifications_available BOOLEAN DEFAULT false,
    low_impact_version BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false
);

-- User workout sessions (completed activities)
CREATE TABLE workout_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workout_library(workout_id),
    
    -- Timing
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_minutes DECIMAL(5,2),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, abandoned
    completion_percentage INT,
    
    -- Self-reported metrics
    difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
    energy_level_before INT CHECK (energy_level_before BETWEEN 1 AND 5),
    energy_level_after INT CHECK (energy_level_after BETWEEN 1 AND 5),
    user_notes TEXT,
    
    -- Calculated metrics (from wearables if available)
    calories_burned INT,
    heart_rate_avg INT,
    heart_rate_max INT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_status CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Convert to hypertable
SELECT create_hypertable('workout_sessions', 'started_at', 
    chunk_time_interval => INTERVAL '1 month');

-- Indexes
CREATE INDEX idx_workout_sessions_user_time ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_status ON workout_sessions(user_id, status);
CREATE INDEX idx_workout_library_type ON workout_library(workout_type);
CREATE INDEX idx_workout_library_published ON workout_library(is_published) WHERE is_published = true;
```

**Design Decisions:**
- Workout library separate from user sessions (one-to-many)
- Self-reported metrics stored alongside wearable data
- Energy levels tracked to identify optimal workout timing
- Completion percentage enables partial workout credit

#### Entity 5: Nutrition and Meal Tracking

```sql
-- Food database (reference data)
CREATE TABLE food_items (
    food_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    barcode VARCHAR(50), -- For scanner integration
    
    -- Nutrition per 100g
    calories DECIMAL(7,2),
    protein_g DECIMAL(6,2),
    carbs_g DECIMAL(6,2),
    fat_g DECIMAL(6,2),
    fiber_g DECIMAL(6,2),
    
    -- Additional micronutrients (optional)
    sodium_mg INT,
    sugar_g DECIMAL(6,2),
    
    -- Categorization
    food_category VARCHAR(50),
    dietary_flags JSONB, -- vegan, gluten-free, etc.
    
    -- Data source
    data_source VARCHAR(50), -- nutritionix, usda, user_created
    verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User meal logs
CREATE TABLE meal_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    logged_at TIMESTAMP NOT NULL,
    meal_type VARCHAR(20), -- breakfast, lunch, dinner, snack
    
    -- Fasting context
    within_eating_window BOOLEAN,
    hours_since_fast_break DECIMAL(4,2),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Meal log items (many-to-one with meal_logs)
CREATE TABLE meal_log_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_log_id UUID NOT NULL REFERENCES meal_logs(log_id) ON DELETE CASCADE,
    food_id UUID REFERENCES food_items(food_id),
    
    -- Custom food entry (if not in database)
    custom_food_name VARCHAR(255),
    
    -- Portion
    serving_size_g DECIMAL(7,2),
    servings DECIMAL(5,2) DEFAULT 1.0,
    
    -- Calculated nutrition (denormalized for quick access)
    calories DECIMAL(7,2),
    protein_g DECIMAL(6,2),
    carbs_g DECIMAL(6,2),
    fat_g DECIMAL(6,2)
);

-- Convert meal_logs to hypertable
SELECT create_hypertable('meal_logs', 'logged_at', 
    chunk_time_interval => INTERVAL '1 month');

-- Indexes
CREATE INDEX idx_meal_logs_user_time ON meal_logs(user_id, logged_at DESC);
CREATE INDEX idx_food_items_barcode ON food_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_food_items_name ON food_items USING gin(to_tsvector('english', name));
```

**Design Decisions:**
- Food database pre-populated from Nutritionix API
- User meal logs reference food items (normalized)
- Nutrition values denormalized in meal_log_items for historical accuracy
- Fasting context tracked automatically
- Barcode index for quick scanner lookup

#### Entity 6: Body Metrics (Sensitive Health Data)

```sql
-- Weight and body composition tracking
CREATE TABLE body_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP NOT NULL,
    
    -- Primary metrics (encrypted at rest via database-level encryption)
    weight_kg DECIMAL(5,2) NOT NULL,
    body_fat_percentage DECIMAL(4,2),
    muscle_mass_kg DECIMAL(5,2),
    bmi DECIMAL(4,2),
    
    -- Measurement method
    measurement_method VARCHAR(50), -- scale, manual, bioelectrical_impedance, dexa
    data_source VARCHAR(50), -- manual, wearable_sync, app_integration
    
    -- Context
    time_of_day VARCHAR(20), -- morning, evening (affects consistency)
    user_notes TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('body_metrics', 'recorded_at', 
    chunk_time_interval => INTERVAL '1 month');

-- Continuous aggregate for trend analysis
CREATE MATERIALIZED VIEW body_metrics_weekly_avg
WITH (timescaledb.continuous) AS
SELECT user_id,
       time_bucket('7 days', recorded_at) AS week,
       AVG(weight_kg) as avg_weight,
       AVG(body_fat_percentage) as avg_bf_pct,
       AVG(bmi) as avg_bmi,
       COUNT(*) as measurement_count
FROM body_metrics
GROUP BY user_id, time_bucket('7 days', recorded_at);

-- Indexes
CREATE INDEX idx_body_metrics_user_time ON body_metrics(user_id, recorded_at DESC);
```

**Design Decisions:**
- All body metrics in single table (simplifies queries)
- Measurement method tracked (self-reported vs. device accuracy)
- Time of day tracked for consistency recommendations
- Weekly aggregates for trend visualization without raw data exposure

#### Entity 7: Gamification & Achievements

```sql
-- Achievement definitions
CREATE TABLE achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    achievement_type VARCHAR(50), -- streak, milestone, special
    
    -- Unlock criteria (JSONB for flexibility)
    criteria JSONB NOT NULL,
    -- Example: {"type": "fasting_streak", "days": 7}
    -- Example: {"type": "total_workouts", "count": 50}
    
    -- Rewards
    xp_reward INT DEFAULT 0,
    badge_image_url VARCHAR(500),
    
    -- Visibility
    is_hidden BOOLEAN DEFAULT false, -- Secret achievements
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User achievement unlocks
CREATE TABLE user_achievements (
    user_achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(achievement_id),
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Progress toward next tier (if applicable)
    current_progress INT DEFAULT 0,
    
    UNIQUE(user_id, achievement_id)
);

-- Streak tracking (denormalized for performance)
CREATE TABLE user_streaks (
    streak_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL, -- fasting, workout, perfect_day
    
    -- Current streak
    current_streak_days INT DEFAULT 0,
    current_streak_start DATE,
    
    -- Best streak
    longest_streak_days INT DEFAULT 0,
    longest_streak_start DATE,
    longest_streak_end DATE,
    
    -- Last activity
    last_activity_date DATE,
    
    -- Freeze tokens
    freeze_tokens_available INT DEFAULT 0,
    freeze_tokens_used INT DEFAULT 0,
    
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, streak_type)
);

-- Indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
```

**Design Decisions:**
- Achievement criteria stored as flexible JSONB
- Streaks denormalized for quick dashboard queries
- Freeze tokens prevent punishing real-life interruptions
- Progress tracking enables multi-tier achievements

#### Entity 8: Social & Community

```sql
-- User relationships (following system)
CREATE TABLE user_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    following_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Relationship type
    relationship_type VARCHAR(20) DEFAULT 'follow', -- follow, squad, accountability_partner
    
    -- Privacy settings
    approved BOOLEAN DEFAULT true, -- For private accounts
    notifications_enabled BOOLEAN DEFAULT true,
    
    UNIQUE(follower_user_id, following_user_id),
    CHECK (follower_user_id != following_user_id)
);

-- User posts (progress sharing)
CREATE TABLE user_posts (
    post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Content
    caption TEXT,
    post_type VARCHAR(50), -- progress_photo, milestone, text, workout_completion
    
    -- Attached data (references to other entities)
    attached_workout_session_id UUID REFERENCES workout_sessions(session_id),
    attached_achievement_id UUID REFERENCES achievements(achievement_id),
    
    -- Media
    media_urls JSONB, -- Array of image/video URLs
    
    -- Visibility
    visibility VARCHAR(20) DEFAULT 'followers', -- public, followers, squad, private
    
    -- Engagement metrics (denormalized for performance)
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0
);

-- Post engagement
CREATE TABLE post_likes (
    like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES user_posts(post_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

CREATE TABLE post_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES user_posts(post_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    comment_text TEXT NOT NULL,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_relationships_follower ON user_relationships(follower_user_id);
CREATE INDEX idx_relationships_following ON user_relationships(following_user_id);
CREATE INDEX idx_posts_user_time ON user_posts(user_id, created_at DESC);
CREATE INDEX idx_posts_visibility ON user_posts(visibility);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id);
```

**Design Decisions:**
- Follow model (not mutual friendship)
- Squad feature uses same relationship table with type flag
- Post engagement metrics denormalized for feed performance
- Moderation flags for community safety

### 5.3 Privacy & GDPR Implementation Details

#### Right to Access (GDPR Article 15)

```sql
-- Automated data export function
CREATE OR REPLACE FUNCTION generate_user_data_export(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    export_data JSON;
BEGIN
    SELECT json_build_object(
        'user_account', (SELECT row_to_json(u) FROM users u WHERE user_id = target_user_id),
        'profile', (SELECT row_to_json(p) FROM user_profiles p WHERE user_id = target_user_id),
        'fasting_sessions', (SELECT json_agg(f) FROM fasting_sessions f WHERE user_id = target_user_id),
        'workout_sessions', (SELECT json_agg(w) FROM workout_sessions w WHERE user_id = target_user_id),
        'meal_logs', (SELECT json_agg(m) FROM meal_logs m WHERE user_id = target_user_id),
        'body_metrics', (SELECT json_agg(b) FROM body_metrics b WHERE user_id = target_user_id),
        'achievements', (SELECT json_agg(a) FROM user_achievements a WHERE user_id = target_user_id),
        'export_timestamp', NOW()
    ) INTO export_data;
    
    RETURN export_data;
END;
$$ LANGUAGE plpgsql;
```

#### Right to Erasure (GDPR Article 17)

```sql
-- Automated user deletion workflow
CREATE OR REPLACE FUNCTION anonymize_and_delete_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Step 1: Anonymize public-facing content (posts, comments)
    UPDATE user_posts 
    SET caption = '[Deleted User]',
        media_urls = '[]'::jsonb
    WHERE user_id = target_user_id;
    
    UPDATE post_comments
    SET comment_text = '[Comment Deleted]'
    WHERE user_id = target_user_id;
    
    -- Step 2: Delete personal health data
    DELETE FROM body_metrics WHERE user_id = target_user_id;
    DELETE FROM meal_logs WHERE user_id = target_user_id;
    DELETE FROM fasting_sessions WHERE user_id = target_user_id;
    DELETE FROM workout_sessions WHERE user_id = target_user_id;
    
    -- Step 3: Delete profile and achievements
    DELETE FROM user_profiles WHERE user_id = target_user_id;
    DELETE FROM user_achievements WHERE user_id = target_user_id;
    DELETE FROM user_streaks WHERE user_id = target_user_id;
    
    -- Step 4: Delete relationships
    DELETE FROM user_relationships 
    WHERE follower_user_id = target_user_id 
       OR following_user_id = target_user_id;
    
    -- Step 5: Mark user account as deleted (preserve for audit)
    UPDATE users 
    SET account_status = 'deleted',
        email_hash = NULL,
        auth_provider_id = NULL,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to permanently delete accounts after 30-day grace period
CREATE OR REPLACE FUNCTION permanent_delete_expired_accounts()
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM users
        WHERE account_status = 'deleted'
          AND updated_at < NOW() - INTERVAL '30 days'
        RETURNING user_id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

#### Retention Policies

```sql
-- Table retention policies
-- Anonymized analytics data retained indefinitely
-- Personal identifiable data deleted per policy

-- Retention policy configuration
CREATE TABLE data_retention_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    retention_period INTERVAL NOT NULL,
    anonymization_rules JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Example policies
INSERT INTO data_retention_policies (table_name, retention_period, anonymization_rules) VALUES
('fasting_sessions', INTERVAL '2 years', '{"user_id": "anonymize"}'),
('workout_sessions', INTERVAL '2 years', '{"user_id": "anonymize"}'),
('body_metrics', INTERVAL '1 year', '{"user_id": "anonymize"}'),
('user_posts', INTERVAL '1 year', '{"caption": "redact", "media_urls": "delete"}');
```

### 5.4 Data Flow Diagram: Fasting Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP                                  │
│  User Action: "Start 16-hour fast"                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼ (HTTPS POST)
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY                                   │
│  • JWT validation                                                │
│  • Rate limiting                                                 │
│  • Request logging                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               FASTING SERVICE                                    │
│  POST /api/v1/fasting/sessions/start                            │
│  {                                                               │
│    "protocol_type": "16-8",                                     │
│    "timezone": "Europe/London"                                  │
│  }                                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL                                    │
│  INSERT INTO fasting_sessions                                    │
│  • session_id generated                                          │
│  • started_at = NOW()                                            │
│  • scheduled_end_at = NOW() + 16 hours                          │
│  • status = 'active'                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├──────────────────────────────────┐
                      ▼                                  ▼
┌────────────────────────────────────┐  ┌────────────────────────────┐
│   NOTIFICATION SERVICE             │  │    ANALYTICS SERVICE       │
│  • Schedule push notification      │  │  • Log event:              │
│    for completion time             │  │    "fasting_started"       │
│  • Add to Redis queue              │  │  • User cohort analysis    │
└────────────────────────────────────┘  └────────────────────────────┘
                      │                                  │
                      ▼                                  ▼
┌────────────────────────────────────┐  ┌────────────────────────────┐
│   FIREBASE CLOUD MESSAGING         │  │      CLICKHOUSE            │
│  • Push notification delivered     │  │  • Aggregate metrics       │
│    16 hours later                  │  │  • Retention analysis      │
└────────────────────────────────────┘  └────────────────────────────┘
```

### 5.5 API Endpoint Specifications (Key Examples)

#### Endpoint: Start Fasting Session

```
POST /api/v1/fasting/sessions/start
Authorization: Bearer <JWT>

Request Body:
{
  "protocol_type": "16-8",
  "timezone": "Europe/London",
  "custom_duration_hours": null  // Optional for custom protocols
}

Response (201 Created):
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "protocol_type": "16-8",
  "started_at": "2025-12-22T08:00:00Z",
  "scheduled_end_at": "2025-12-23T00:00:00Z",
  "status": "active",
  "hours_remaining": 16.0,
  "estimated_calories_burned": 120
}

Error Responses:
400 Bad Request: Invalid protocol_type
409 Conflict: Active fasting session already exists
429 Too Many Requests: Rate limit exceeded
```

#### Endpoint: Complete Workout

```
POST /api/v1/workouts/sessions/complete
Authorization: Bearer <JWT>

Request Body:
{
  "session_id": "770e8400-e29b-41d4-a716-446655440000",
  "workout_id": "880e8400-e29b-41d4-a716-446655440002",
  "duration_minutes": 18.5,
  "difficulty_rating": 4,
  "energy_level_before": 3,
  "energy_level_after": 5,
  "completion_percentage": 100,
  "calories_burned": 187,  // Optional: from wearable
  "heart_rate_avg": 145     // Optional: from wearable
}

Response (200 OK):
{
  "session_id": "770e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "xp_earned": 50,
  "new_achievements": [
    {
      "achievement_id": "990e8400-e29b-41d4-a716-446655440003",
      "name": "First Workout Complete",
      "xp_bonus": 100
    }
  ],
  "streak_updated": {
    "type": "workout",
    "current_streak_days": 8,
    "longest_streak_days": 12
  },
  "level_up": false,
  "avatar_updated": true
}
```

#### Endpoint: Get Progress Dashboard

```
GET /api/v1/users/me/dashboard?period=7d
Authorization: Bearer <JWT>

Response (200 OK):
{
  "user": {
    "user_id": "660e8400-e29b-41d4-a716-446655440001",
    "avatar_level": 5,
    "total_xp": 2450,
    "next_level_xp": 3000
  },
  "period": {
    "start_date": "2025-12-15",
    "end_date": "2025-12-22",
    "days": 7
  },
  "fasting_stats": {
    "sessions_started": 7,
    "sessions_completed": 6,
    "adherence_rate": 85.7,
    "average_duration_hours": 16.2,
    "current_streak_days": 6,
    "longest_streak_days": 12
  },
  "workout_stats": {
    "sessions_completed": 5,
    "total_minutes": 87,
    "calories_burned": 735,
    "current_streak_days": 5,
    "favorite_workout_type": "hiit"
  },
  "body_metrics": {
    "weight_change_kg": -0.8,
    "weight_trend": "decreasing",
    "latest_weight_kg": 78.2,
    "latest_recorded_at": "2025-12-22T07:30:00Z"
  },
  "achievements_unlocked": [
    {
      "achievement_id": "990e8400-e29b-41d4-a716-446655440003",
      "name": "Week Warrior",
      "unlocked_at": "2025-12-21T18:00:00Z"
    }
  ],
  "insights": [
    {
      "type": "pattern_recognition",
      "message": "Your workout consistency is highest on Mondays. Consider scheduling important workouts on this day.",
      "confidence": 0.89
    },
    {
      "type": "recommendation",
      "message": "You're 1 workout away from a 7-day streak! Keep it up.",
      "action_required": true
    }
  ]
}
```

### 5.6 Database Scaling Strategy

**Phase 1: MVP (0-10K users)**
- Single PostgreSQL instance (RDS db.t3.large)
- TimescaleDB extension enabled
- Read replicas: 1 (for analytics queries)
- Redis single instance for caching

**Phase 2: Growth (10K-100K users)**
- PostgreSQL vertical scaling (db.m5.xlarge)
- Read replicas: 2-3 (geographic distribution)
- Redis cluster (3 nodes)
- Introduce connection pooling (PgBouncer)
- Table partitioning for high-volume tables

**Phase 3: Scale (100K+ users)**
- Multi-region PostgreSQL deployment
- Sharding strategy by user_id hash
- Separate database for analytics (ClickHouse)
- ElasticSearch for search workloads
- CDN for static content (workout videos)

**Monitoring & Alerts:**
- Slow query identification (> 100ms)
- Connection pool exhaustion
- Replication lag monitoring
- Disk space utilization (alert at 80%)
- Error rate thresholds

---

## 6. Onboarding Flow Prototype: First-Week Habit Formation

### 6.1 Onboarding Psychology Framework

**Behavioral Science Principles Applied:**

1. **Commitment Escalation:** Start with micro-commitments, gradually increase
2. **Identity Formation:** Position user as "optimizer" not "dieter"
3. **Self-Efficacy Building:** Early wins create confidence
4. **Habit Stacking:** Attach new behaviors to existing routines
5. **Social Proof:** Demonstrate community success without pressure

### 6.2 Day-by-Day First Week Experience

#### Day 0: Onboarding (Covered in Section 3.2)

**Goal:** Complete profile setup, understand core value proposition  
**Key Metric:** Onboarding completion rate (target: 80%+)

#### Day 1: First Fast Initiation

**Morning (User Wakes Up):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (8:00 AM)                        │
│  🌟 Ready to start your first fast? Your eating window opens    │
│  at 12:00 PM today. Tap to begin tracking.                     │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   WELCOME BACK SCREEN                           │
│  Good morning, [Name]!                                          │
│                                                                 │
│  Your personalized plan is ready. Let's start your first fast. │
│                                                                 │
│  Today's Fast: 16 hours                                         │
│  Start: 8:00 PM (last night)  ← Already in progress!           │
│  End: 12:00 PM (today)                                          │
│                                                                 │
│  [Timer shows: 4 hours remaining]                               │
│                                                                 │
│  💡 Tip: Black coffee, tea, and water are encouraged           │
│                                                                 │
│  [I understand] [What if I'm hungry?]                          │
└─────────────────────────────────────────────────────────────────┘
```

**Design Decision:** Assume user started fasting from last night's dinner (most natural 16/8 pattern). Don't make them "start" - they're already partway through first fast. This creates instant progress.

**Midday (11:00 AM - 1 hour before window opens):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (11:00 AM)                       │
│  🎯 1 hour until your eating window! You're 93% through your    │
│  first fast. Great job staying consistent!                     │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   FIRST FAST NEARING COMPLETION                 │
│                                                                 │
│  [Large circular timer: 00:58:34 remaining]                     │
│                                                                 │
│  You're almost there! 🎉                                        │
│                                                                 │
│  When your eating window opens:                                 │
│  ✓ Break your fast mindfully with protein                       │
│  ✓ Stay hydrated throughout                                     │
│  ✓ No need to overeat - normal portion sizes                   │
│                                                                 │
│  Quick question: How are you feeling right now?                 │
│  [Energized] [Hungry] [Neutral] [Tired]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Noon (Window Opens):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (12:00 PM)                       │
│  🎊 Congratulations! You completed your first 16-hour fast!     │
│  Your eating window is now open. Tap to see what's next.       │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│               FIRST MILESTONE CELEBRATION                       │
│  🏆 First Fast Complete! 🏆                                     │
│                                                                 │
│  [Animated confetti effect]                                     │
│  [Avatar character celebrates - level up animation]             │
│                                                                 │
│  You earned:                                                    │
│  • 100 XP + "First Fast" Achievement                            │
│  • Unlocked: Meal logging feature                               │
│                                                                 │
│  Your eating window: 12:00 PM - 8:00 PM                        │
│                                                                 │
│  Optional: Log your first meal to see how UGOKI helps you      │
│  optimize nutrition during your eating window.                  │
│                                                                 │
│  [Log Meal] [I'll do it later]                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Evening (6:00 PM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (6:00 PM)                        │
│  🏃 Perfect time for your first workout! Your body is fueled    │
│  and ready. 15-minute HIIT session recommended.                │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  FIRST WORKOUT INVITATION                       │
│  Great timing! You've eaten, you're energized.                  │
│                                                                 │
│  Ready for your first 15-minute HIIT workout?                   │
│                                                                 │
│  Why now?                                                       │
│  • You're within your eating window (fueled)                    │
│  • Exercise enhances metabolic benefits of IF                   │
│  • Evening workouts improve sleep quality                       │
│                                                                 │
│  [Start Recommended Workout]                                    │
│  [Browse Other Options]                                         │
│  [Remind Me Later]                                              │
└─────────────────────────────────────────────────────────────────┘
```

**If User Completes Workout:**

```
┌─────────────────────────────────────────────────────────────────┐
│               PERFECT DAY ACHIEVED                              │
│  🌟 PERFECT DAY 🌟                                              │
│                                                                 │
│  You completed:                                                 │
│  ✓ 16-hour fast                                                 │
│  ✓ First workout                                                │
│  ✓ Meal logged                                                  │
│                                                                 │
│  This is how optimizers are made. Tomorrow, let's do it again!  │
│                                                                 │
│  Bonus: +200 XP (Perfect Day)                                   │
│  [View Progress] [Done]                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### Day 2: Consistency Building

**Morning (8:00 AM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (8:00 AM)                        │
│  🔥 Day 2! Your eating window opens at 12:00 PM. You've got    │
│  this. 4 hours to go.                                           │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   DAY 2 DASHBOARD                               │
│  Welcome back, [Name]!                                          │
│                                                                 │
│  Current Fast: 12:47:23 / 16:00:00                             │
│  [Progress ring: 80% complete]                                  │
│                                                                 │
│  Streak: 🔥 2 days (keep it going!)                            │
│                                                                 │
│  Yesterday's Wins:                                              │
│  ✓ Completed 16-hour fast                                       │
│  ✓ First workout finished                                       │
│                                                                 │
│  Today's Goals:                                                 │
│  ☐ Complete today's fast (3h 12m remaining)                    │
│  ☐ Try a different workout (optional)                          │
│  ☐ Log weight (track progress)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Differences from Day 1:**
- No lengthy explanations (user understands basics)
- Streak prominently displayed (psychological commitment)
- Optional weight logging introduced (not mandatory)
- Less hand-holding, more autonomy

**Evening (7:00 PM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTEXTUAL INSIGHT                                 │
│  💡 Did you know?                                               │
│                                                                 │
│  Users who complete 2 consecutive fasts are 3x more likely     │
│  to maintain the habit long-term.                               │
│                                                                 │
│  You're building something sustainable. Keep going!             │
│                                                                 │
│  [Close]                                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Day 3: Challenge Introduction

**Morning (8:00 AM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (8:00 AM)                        │
│  🎯 Day 3 Challenge: The "Hump Day" - Studies show day 3 is    │
│  the hardest. You're prepared. Let's do this.                  │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   DAY 3: CHALLENGE DAY                          │
│  Morning, [Name]! Today is important.                           │
│                                                                 │
│  Day 3 is typically the hardest for new fasters:                │
│  • Your body is still adapting                                  │
│  • Hunger hormones (ghrelin) peak                               │
│  • Motivation can waver                                         │
│                                                                 │
│  But here's the secret:                                         │
│  Day 4 gets significantly easier. Your body starts              │
│  efficiently using stored energy.                               │
│                                                                 │
│  If you push through today, you've won.                         │
│                                                                 │
│  [Start Today's Fast] [I need support]                         │
└─────────────────────────────────────────────────────────────────┘
```

**If User Clicks "I need support":**

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUPPORT RESOURCES                             │
│  We've got your back. Here's how to make today easier:          │
│                                                                 │
│  1. Stay Busy: Hunger comes in waves. Distraction works.        │
│  2. Hydrate: Often hunger is thirst. Aim for 2L water today.   │
│  3. Quality Sleep: Poor sleep increases hunger hormones.        │
│  4. Community: 1,247 users completed Day 3 this week.           │
│                                                                 │
│  Emergency Options:                                              │
│  • Shorten today's fast to 14 hours (still beneficial)          │
│  • Join a live "Fasting Q&A" session at 2:00 PM                │
│  • Message your accountability squad                             │
│                                                                 │
│  [I'm ready] [Connect with community]                          │
└─────────────────────────────────────────────────────────────────┘
```

**Design Philosophy:** Acknowledge difficulty. Users respect honesty. Offer support without enabling early quit. Provide community connection as motivational tool.

#### Day 4-5: Adaptation & Routine

**Morning (8:00 AM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (8:00 AM)                        │
│  ✨ Day 4: The adaptation phase begins. Most users report       │
│  significantly reduced hunger. Notice the difference?           │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   ADAPTATION PHASE                              │
│  [Dashboard view with expanded metrics]                         │
│                                                                 │
│  Streak: 🔥 4 days (86% of users don't reach this!)            │
│                                                                 │
│  Your Progress:                                                 │
│  • Total fasting hours: 64                                      │
│  • Workouts completed: 3                                        │
│  • Weight trend: -0.6 kg ↓                                      │
│                                                                 │
│  New Unlocked:                                                  │
│  • Meal planner (weekly view)                                   │
│  • Community feed access                                        │
│  • Custom protocol (advanced)                                   │
│                                                                 │
│  [Continue] [Explore New Features]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Gradual Feature Introduction:**
- Days 1-3: Core features only (reduce cognitive load)
- Days 4-5: Unlock "nice-to-have" features (reward progression)
- Days 6-7: Full platform access

#### Day 6: Social Connection

**Morning (8:00 AM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (8:00 AM)                        │
│  🤝 Day 6: You're not alone. 1,247 people started their fast   │
│  at the same time as you today. Connect with your tribe.       │
└─────────────────────────────────────────────────────────────────┘
```

**User Opens App:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMMUNITY INVITATION                          │
│  You've proven you can do this alone. But why should you?       │
│                                                                 │
│  UGOKI Community:                                               │
│  • Share your progress (optional)                               │
│  • Join accountability squads (4-8 people)                      │
│  • Follow optimizers with similar goals                         │
│                                                                 │
│  Featured Squad:                                                │
│  "Early Morning Warriors" - 6 members, avg streak: 23 days     │
│  [Request to Join]                                              │
│                                                                 │
│  Or: [Browse All Squads] [Create Private Squad] [Skip]         │
└─────────────────────────────────────────────────────────────────┘
```

**Design Decision:** Introduce social features after habits are forming (Day 6), not immediately. Users need to prove to themselves they can succeed before joining community.

#### Day 7: First Week Celebration & Future Projection

**Morning (8:00 AM):**

```
┌─────────────────────────────────────────────────────────────────┐
│              PUSH NOTIFICATION (8:00 AM)                        │
│  🎊 FINAL DAY OF WEEK 1! Complete today's fast to unlock your  │
│  personalized 30-day optimization plan. You're incredible.     │
└─────────────────────────────────────────────────────────────────┘
```

**Upon Completing Day 7 Fast:**

```
┌─────────────────────────────────────────────────────────────────┐
│            WEEK 1 COMPLETION CELEBRATION                        │
│  🏆 YOU DID IT! 🏆                                              │
│                                                                 │
│  [Elaborate animation: Avatar evolves to Level 3]               │
│                                                                 │
│  Your First Week Stats:                                         │
│  • Fasts completed: 7/7 (100% adherence) 🔥                    │
│  • Workouts: 5                                                  │
│  • Total fasting hours: 112                                     │
│  • Weight change: -1.2 kg                                       │
│  • XP earned: 1,450                                             │
│                                                                 │
│  Achievements Unlocked:                                         │
│  🏅 Week Warrior (+500 XP)                                      │
│  🏅 Perfect Week (+1000 XP)                                     │
│  🏅 Consistency Champion (+200 XP)                              │
│                                                                 │
│  [Continue] [Share My Week] [See Full Report]                  │
└─────────────────────────────────────────────────────────────────┘
```

**Next Screen:**

```
┌─────────────────────────────────────────────────────────────────┐
│            YOUR PERSONALIZED 30-DAY PLAN                        │
│  Based on your first week, here's your optimized path:          │
│                                                                 │
│  Week 2-3: Intensity Building                                   │
│  • Increase workout difficulty                                  │
│  • Experiment with extended fasts (18-20h, optional)            │
│  • Join 2 community challenges                                  │
│                                                                 │
│  Week 4: Assessment & Adaptation                                │
│  • Body composition review                                      │
│  • Protocol optimization based on your data                     │
│  • Set Month 2 goals                                            │
│                                                                 │
│  Projected Outcomes (30 days):                                  │
│  • Weight: -3.5 to -4.2 kg                                      │
│  • Energy levels: +35% increase                                 │
│  • Metabolic adaptation: Complete                               │
│                                                                 │
│  [Lock In My Plan] [Customize]                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Onboarding Retention Mechanisms

#### Micro-Commitments Ladder

```
Day 1: Just complete one fast (easy)
Day 2: Do it one more time (manageable)
Day 3: Push through the challenge (difficult but supported)
Day 4-5: Notice it's getting easier (self-efficacy boost)
Day 6: Join community (social commitment)
Day 7: Complete the week (major milestone)
```

**Escalating Investment:**
- Time invested (7 days of activity)
- Identity formation ("I'm an optimizer")
- Social connections (squad membership)
- Progress visible (avatar evolution, weight change)
- Sunk cost (don't want to lose streak)

#### Friction Reduction Strategy

**Eliminated Friction Points:**
| Friction | Solution |
|----------|----------|
| "When should I start?" | Pre-populate first fast as already in progress |
| "Am I doing it right?" | Contextual tips at decision points |
| "What if I mess up?" | Streak freeze tokens (forgiveness mechanism) |
| "Is this working?" | Weekly metrics summary with trends |
| "I'm alone in this" | Gradual community introduction |

#### Habit Formation Triggers

**Automatic Trigger System:**

```
Time-based triggers:
• 8:00 AM: Morning motivation
• 11:00 AM: Pre-window opening reminder
• 12:00 PM: Window opens celebration
• 6:00 PM: Workout invitation
• 8:00 PM: Window closing reminder

Event-based triggers:
• Fast completed → Celebration + next step
• Workout finished → XP reward + share prompt
• Milestone reached → Achievement unlock + community post
• Streak broken → Support resources + recovery plan

Context-based triggers:
• Location: Gym nearby → Workout suggestion
• Time of day: Evening → Wind-down meditation
• Weather: Sunny → Outdoor workout option
```

### 6.4 Week 1 Success Metrics

**Measurement Framework:**

| Metric | Target | Measurement Point |
|--------|--------|-------------------|
| **Onboarding completion rate** | 80% | End of Day 0 |
| **Day 1 fast completion** | 85% | End of Day 1 |
| **Day 3 retention** | 70% | Morning of Day 4 |
| **Day 7 retention** | 60% | End of Week 1 |
| **Perfect Week achievement** | 40% | Users with 7/7 fasts |
| **Workout engagement** | 50% | Users completing ≥1 workout |
| **Social feature adoption** | 30% | Users joining squads/following others |
| **NPS after Week 1** | ≥ 40 | In-app survey |

**Intervention Triggers:**

```
If Day 3 retention < 70%:
→ Implement more aggressive support messaging
→ Increase streak freeze availability
→ Add live Q&A sessions

If workout engagement < 50%:
→ Simplify workout discovery
→ Add 5-minute "micro-workout" options
→ Better timing recommendations

If social adoption < 30%:
→ Earlier community introduction
→ Auto-match users to squads
→ Highlight social proof more prominently
```

---

## 7. Implementation Roadmap & Timeline

### 7.1 Pre-Development Phase (Weeks 1-4)

**Week 1-2: Foundation**
- [ ] Finalize MVP feature scope (this document)
- [ ] User research: Interview scheduling & execution
- [ ] Design system creation (Figma)
- [ ] Technology stack approval & procurement

**Week 3-4: Preparation**
- [ ] User research analysis & insights report
- [ ] High-fidelity prototype development
- [ ] Usability testing execution
- [ ] Development environment setup
- [ ] Third-party service contracts (Stripe, Nutritionix, Firebase)

### 7.2 Development Sprints (Weeks 5-16)

**Sprint 1-2 (Weeks 5-6): Core Infrastructure**
- [ ] Database schema implementation
- [ ] API gateway configuration
- [ ] Authentication service (OAuth + anonymous)
- [ ] User service (profiles, settings)
- [ ] CI/CD pipeline establishment
- [ ] Monitoring & logging setup (Sentry, DataDog)

**Sprint 3-4 (Weeks 7-8): Fasting Core**
- [ ] Fasting timer service
- [ ] TimescaleDB time-series integration
- [ ] Push notification service
- [ ] Fasting session CRUD APIs
- [ ] Mobile app: Timer UI
- [ ] Mobile app: Onboarding flow (first 3 steps)

**Sprint 5-6 (Weeks 9-10): Workout System**
- [ ] Workout library database population
- [ ] Video hosting setup (S3 + CloudFront)
- [ ] Workout service APIs
- [ ] Mobile app: Workout player
- [ ] Mobile app: Workout library browsing
- [ ] Workout session tracking

**Sprint 7-8 (Weeks 11-12): Progress & Nutrition**
- [ ] Progress dashboard APIs
- [ ] Body metrics service
- [ ] Nutritionix API integration
- [ ] Basic meal logging
- [ ] Mobile app: Dashboard UI
- [ ] Mobile app: Meal logging UI

**Sprint 9-10 (Weeks 13-14): Gamification**
- [ ] Achievement system
- [ ] Streak calculation (continuous aggregates)
- [ ] XP & leveling mechanics
- [ ] Avatar progression system
- [ ] Mobile app: Gamification UI
- [ ] Celebration animations

**Sprint 11-12 (Weeks 15-16): Testing & Polish**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] GDPR compliance review
- [ ] Beta testing with 50-100 users
- [ ] Bug fixing & refinement

### 7.3 Launch Phase (Weeks 17-20)

**Week 17: Pre-Launch**
- [ ] App Store & Google Play submission
- [ ] Landing page live (waitlist → app store links)
- [ ] Marketing materials finalization
- [ ] Customer support setup (Intercom)
- [ ] Analytics dashboard configuration

**Week 18: Soft Launch**
- [ ] Release to limited audience (UK only)
- [ ] Monitor for critical bugs
- [ ] Gather initial feedback
- [ ] Hot-fix deployment if needed

**Week 19-20: Public Launch**
- [ ] Full public availability
- [ ] Marketing campaign activation
- [ ] PR outreach (fitness blogs, wellness media)
- [ ] Influencer partnerships
- [ ] Community management begins

---

## 8. Risk Mitigation & Contingency Planning

### 8.1 Technical Risks

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| **Wearable integration delays** | Abstract behind adapter layer, phase post-MVP | Launch without wearables, add in v1.1 |
| **Video hosting costs exceed budget** | Compress videos, use adaptive bitrate | Start with YouTube Private embedding |
| **Database performance issues** | Load testing in Sprint 11-12 | Scale vertically, add read replicas |
| **App Store rejection** | Follow guidelines strictly, pre-submission review | Address feedback, resubmit within 48h |

### 8.2 Product Risks

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| **IF-HIIT positioning doesn't resonate** | Validate in user research (Phase 4.3) | Pivot to standalone IF or HIIT positioning |
| **Low Week 1 retention** | Implement retention metrics from Day 1 | Increase onboarding support, add coaching |
| **Feature scope creep** | Strict MoSCoW adherence | Cut "Could Have" features aggressively |
| **User acquisition cost too high** | Organic growth focus (referrals, community) | Delay paid marketing, build waitlist |

### 8.3 Compliance Risks

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| **GDPR violations** | Legal review at Sprint 11, privacy-by-design | Hire data protection officer, fix immediately |
| **Medical device classification** | Avoid diagnostic language, position as lifestyle app | Consult regulatory expert, adjust messaging |
| **Content moderation issues** | AI-assisted moderation + human review | Temporary manual review, hire moderators |

---

## 9. Success Criteria & KPIs

### 9.1 Launch Success Metrics (First 30 Days)

| KPI | Target | Measurement |
|-----|--------|-------------|
| **App downloads** | 5,000+ | App Store + Google Play analytics |
| **Onboarding completion** | 80%+ | Firebase Analytics events |
| **Day 7 retention** | 60%+ | Cohort analysis |
| **Perfect Week achievers** | 40%+ | Achievement unlock data |
| **Paid conversion rate** | 5%+ | Stripe dashboard |
| **NPS score** | ≥ 40 | In-app survey |
| **Critical bugs** | < 5 per 1000 users | Sentry error tracking |
| **App Store rating** | ≥ 4.3/5 | App Store Connect |

### 9.2 Long-Term Success Indicators (6 Months)

- **Monthly Active Users (MAU):** 15,000+
- **Churn rate:** < 10% monthly
- **Lifetime Value (LTV):** ≥ £120 per user
- **Customer Acquisition Cost (CAC):** < £20
- **LTV:CAC ratio:** ≥ 6:1
- **Organic growth rate:** 40%+ of new users from referrals
- **Community engagement:** 30%+ of users in squads

---

## 10. Next Actions & Ownership

### 10.1 Immediate Next Steps (Week 1)

| Action | Owner | Deadline |
|--------|-------|----------|
| Approve technology stack | Technical Lead | Day 3 |
| Finalize MVP feature scope | Product Manager | Day 5 |
| User research participant recruitment | UX Researcher | Day 7 |
| Design system kickoff | Design Lead | Day 7 |

### 10.2 Approval Gates

**Gate 1: User Research Complete (Week 4)**
- [ ] Research insights report approved
- [ ] Feature prioritization validated
- [ ] Value proposition messaging confirmed
- **Decision:** Proceed to development or pivot

**Gate 2: MVP Build Complete (Week 16)**
- [ ] All MVP features functional
- [ ] Beta testing successful
- [ ] Performance benchmarks met
- **Decision:** Submit to app stores or extend testing

**Gate 3: Launch Readiness (Week 17)**
- [ ] App Store approval received
- [ ] Marketing materials ready
- [ ] Support infrastructure live
- **Decision:** Soft launch or delay

---

## 11. Conclusion

This implementation plan provides a comprehensive roadmap from concept to MVP launch for UGOKI, grounded in user-centric design, privacy-first architecture, and behavioral science principles.

**Key Differentiators:**
1. **IF-HIIT Integration:** Unique market positioning validated through user research
2. **Privacy-by-Design:** GDPR compliance from day one, not retrofitted
3. **Gamified Habit Formation:** Avatar progression system as retention driver
4. **User-First Onboarding:** Week 1 experience optimized for habit formation

**Critical Success Factors:**
- Ruthless MVP scope discipline (resist feature creep)
- User research validation before significant development investment
- Week 1 retention optimization (60% target)
- Community feature adoption (30% target)

**Timeline Summary:**
- **Weeks 1-4:** User research & validation
- **Weeks 5-16:** Development sprints
- **Weeks 17-20:** Launch & stabilization
- **Total:** ~20 weeks to public availability

This plan positions UGOKI for a successful launch in the competitive wellness market by delivering genuine value to busy professionals seeking sustainable human optimization.

---

**Document Status:** Ready for review and approval  
**Next Review:** Post user research completion (Week 4)  
**Version Control:** Track changes via Git repository
