# UGOKI Roadmap

**Current Phase:** MVP Complete | **Last Updated:** January 2026

---

## Immediate Next Steps

Priority tasks for production launch:

| # | Task | Status | Guide |
|---|------|--------|-------|
| 1 | Deploy backend to Fly.io | Pending | [guides/BACKEND.md#deployment](../guides/BACKEND.md#deployment) |
| 2 | Configure production database | Pending | [guides/BACKEND.md#database](../guides/BACKEND.md#database) |
| 3 | Set up Sentry error tracking | Pending | [guides/BACKEND.md#monitoring](../guides/BACKEND.md#monitoring) |
| 4 | Build iOS app via EAS | Pending | [guides/MOBILE.md#eas-builds](../guides/MOBILE.md#eas-builds) |
| 5 | Build Android app via EAS | Pending | [guides/MOBILE.md#eas-builds](../guides/MOBILE.md#eas-builds) |
| 6 | Submit to App Store | Pending | - |
| 7 | Submit to Play Store | Pending | - |

---

## MVP Complete - What's Included

**January 2026:** The MVP includes all core platform features plus health device integration:

| Feature | Status | Documentation |
|---------|--------|-----------------|
| Intermittent Fasting Timer | Complete | [features/fasting.md](../features/fasting.md) |
| HIIT Workout Library (23 workouts) | Complete | [features/workouts.md](../features/workouts.md) |
| AI Coach (Claude-powered) | Complete | [features/ai-coach.md](../features/ai-coach.md) |
| Research Hub (PubMed integration) | Complete | [features/research.md](../features/research.md) |
| Bloodwork Analysis | Complete | [features/bloodwork.md](../features/bloodwork.md) |
| Social Features | Complete | [features/social.md](../features/social.md) |
| Progression System | Complete | [features/progression.md](../features/progression.md) |
| **Health Device Integration** (Apple HealthKit + Google Health Connect) | **Complete** | **[FITNESS_TOOLS.md](../FITNESS_TOOLS.md)** |

---

## Post-MVP Phases

### Phase 2: Engagement & Retention

**Goal:** Increase DAU/MAU ratio and 30-day retention.

| Feature | Priority | Status | Spec |
|---------|----------|--------|------|
| Expanded fasting protocols (24h, 5:2, ADF) | P1 | Planned | [features/fasting.md#protocols](../features/fasting.md#protocols) |
| Workout reminders & scheduling | P2 | Planned | - |
| Weekly progress reports | P2 | Planned | - |
| Avatar/character progression | P2 | Planned | - |
| Background health sync (expo-background-fetch) | P2 | Planned | [FITNESS_TOOLS.md#future-enhancements](../FITNESS_TOOLS.md#future-enhancements) |

### Phase 3: Monetization

**Goal:** Launch premium subscription tier.

| Feature | Priority | Status | Spec |
|---------|----------|--------|------|
| Premium subscription infrastructure | P1 | Planned | - |
| Extended AI Coach usage (50/day vs 10/day) | P1 | Planned | - |
| Advanced analytics & insights | P2 | Planned | - |
| Custom workout creation | P2 | Planned | - |
| Meal planning with recipes | P2 | Planned | - |

### Phase 4: Growth

**Goal:** Viral features and community building.

| Feature | Priority | Status | Spec |
|---------|----------|--------|------|
| Social sharing of achievements | P1 | Planned | - |
| Public challenges with invites | P1 | Planned | [features/social.md#challenges](../features/social.md#challenges) |
| Referral program | P2 | Planned | - |
| Community leaderboards | P2 | Planned | - |

### Phase 5: Advanced Features

**Goal:** Differentiation and stickiness.

| Feature | Priority | Status | Spec |
|---------|----------|--------|------|
| AI scheduling agents | P2 | Backlog | - |
| Voice control integration | P3 | Backlog | - |
| Live workout streaming | P3 | Backlog | - |
| Meditation hub | P3 | Backlog | - |
| Barcode scanner for nutrition | P3 | Backlog | - |

---

## Feature Backlog

Lower priority items for future consideration:

| Feature | Category | Notes |
|---------|----------|-------|
| Apple Watch companion app | Wearables | Requires native development |
| Location-based features | Social | Gym check-ins, running routes |
| Influencer/trainer ecosystem | Content | User-generated workouts |
| Grocery delivery integration | Nutrition | Partnership required |
| Corporate wellness programs | B2B | Enterprise tier |
| Multi-language support | Localization | i18n infrastructure needed |

---

## Version History

| Version | Date | Milestone |
|---------|------|-----------|
| 0.1.0 | Dec 2025 | Initial architecture design |
| 0.5.0 | Dec 2025 | Core modules complete |
| 0.9.0 | Jan 2026 | Mobile app complete |
| 1.0.0 | Jan 2026 | MVP ready for launch |

---

## Priority Definitions

| Priority | Meaning |
|----------|---------|
| P1 | Must have for this phase |
| P2 | Should have, high impact |
| P3 | Nice to have, lower impact |
| Backlog | Future consideration |

---

## References

- **Current Status:** [PRD.md#current-status](PRD.md#current-status)
- **Feature Specs:** [features/](../features/)
- **Architecture:** [architecture/OVERVIEW.md](../architecture/OVERVIEW.md)
