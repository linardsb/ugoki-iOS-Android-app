# Feature: Health Metrics & Device Sync

Health data integration from Apple HealthKit and Google Health Connect with trend tracking and AI Coach integration.

---

## Overview

UGOKI integrates with device health apps to automatically sync health metrics without manual entry. Users can connect their Apple Health (iOS) or Google Health Connect (Android) to provide real-time context for workout recommendations and AI coaching. All health data is encrypted in transit and stored securely with clear audit trails.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Health Sync API | Complete |
| AI Coach Integration | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to connect Apple Health so that the AI Coach sees my latest metrics
- As a user, I want to revoke health permission without losing other data
- As a user, I want to see my health data trends so that I track improvements
- As a user, I want the AI Coach to personalize advice based on my recovery status
- As a user, I want my health data encrypted and secure

---

## Supported Metrics

### Device-Synced Metrics

| Metric | iOS (HealthKit) | Android (Health Connect) | UGOKI Metric Type | Unit |
|--------|---|---|---|---|
| **Heart Rate** | ✅ heartRate | ✅ HeartRateRecord | `health_heart_rate` | bpm |
| **Resting HR** | ✅ restingHeartRate | ✅ Derived | `health_resting_hr` | bpm |
| **Heart Rate Variability** | ✅ heartRateVariabilitySDNN | ✅ HeartRateVariabilityRmssdRecord | `health_hrv` | ms |
| **Sleep Duration** | ✅ sleepAnalysis | ✅ SleepSessionRecord | `sleep_hours` | hours |
| **Sleep Quality** | ✅ sleepAnalysis (stages) | ✅ SleepSessionRecord (stages) | `sleep_quality` | 1-5 |
| **Steps** | ✅ stepCount | ✅ StepsRecord | `steps` | count |
| **Active Calories** | ✅ activeEnergyBurned | ✅ ActiveCaloriesBurnedRecord | `calories_burned` | kcal |
| **Weight** | ✅ bodyMass | ✅ WeightRecord | `weight_kg` | kg |
| **Body Fat %** | ✅ bodyFatPercentage | ✅ BodyFatRecord | `body_fat_pct` | % |
| **HIIT Workouts** | ✅ highIntensityIntervalTraining | ✅ ExerciseSessionRecord | `workout_minutes` | min |

---

## API Endpoints

| Method | Endpoint | Description | Auth | PHI |
|--------|----------|-------------|------|-----|
| POST | `/api/v1/health-sync` | Sync device metrics | Yes | Yes |
| GET | `/api/v1/health-sync/status` | Check sync status | Yes | No |
| GET | `/api/v1/health-sync/context` | Get health context with AI insights and recovery score | Yes | Yes |
| GET | `/api/v1/metrics?source=DEVICE_SYNC` | Get synced metrics | Yes | Yes |
| DELETE | `/api/v1/metrics/health` | Delete all health metrics | Yes | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/routes/health_sync.py` | Health sync endpoint |
| `apps/api/src/modules/metrics/service.py` | Metric storage and retrieval |
| `apps/api/src/modules/metrics/orm.py` | Metrics table with source tracking |
| `apps/api/src/modules/ai_coach/tools/fitness_tools.py` | Health context for AI Coach |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/health/hooks/useHealthSync.ts` | Unified iOS/Android hook |
| `apps/mobile/features/health/types.ts` | TypeScript interfaces |
| `apps/mobile/features/health/components/HealthSyncCard.tsx` | Settings UI component |
| `apps/mobile/app/(modals)/settings.tsx` | Health sync in Settings |

---

## Data Models

### Health Data Payload (Mobile → Backend)

```typescript
interface HealthDataPayload {
  resting_heart_rate?: number;      // bpm
  hrv?: number;                      // ms (milliseconds)
  sleep_hours?: number;              // hours
  steps?: number;                    // count
  active_calories?: number;          // kcal
  weight_kg?: number;               // kg
  body_fat_pct?: number;            // percentage
  synced_at: string;                // ISO datetime
}
```

### Stored Metric (Backend)

```typescript
interface Metric {
  id: string;
  identity_id: string;
  metric_type: string;              // e.g., "health_heart_rate"
  value: number;
  unit: string;                     // e.g., "bpm", "hours", "%"
  timestamp: string;                // ISO datetime
  source: "user_input" | "calculated" | "DEVICE_SYNC";
  metadata?: {
    reference_low?: number;
    reference_high?: number;
  };
}
```

### Health Sync Status

```typescript
interface HealthSyncStatus {
  is_connected: boolean;
  last_sync: string | null;         // ISO datetime
  synced_metrics: string[];         // List of metric_types
}
```

### Health Context (for AI Coach)

```typescript
interface HealthContext {
  has_data: boolean;                  // True if any health data available
  metrics: Record<string, MetricValue>;  // Latest values by metric_type
  insights: string[];                 // AI Coach-generated insights
  recovery: {
    score: number;                    // 0-100 (calculated from HRV + RHR + sleep)
    status: "poor" | "fair" | "good" | "excellent";
    recommendation: string;           // "Rest day recommended" or "Ready for intense workout"
  };
  user_health_summary: {
    resting_hr: number | null;       // bpm, null if not available
    hrv: number | null;               // ms (Heart Rate Variability)
    sleep_average: number | null;     // hours (last 7 days)
    activity_level: "sedentary" | "light" | "moderate" | "vigorous";
    trend: "improving" | "stable" | "declining";
  };
  recommendations: string[];          // Personalized health/activity recommendations
  warnings: string[];                 // Health warnings if any (e.g., "Low sleep detected")
  last_7_days_summary: {
    avg_sleep: number;                // hours
    avg_resting_hr: number;           // bpm
    total_steps: number;
    total_workouts: number;
  };
}

interface MetricValue {
  value: number;
  unit: string;
  recorded_at: string;                // ISO datetime
}
```

### API Response Examples

**GET `/api/v1/health-sync/context` Response:**

```json
{
  "has_data": true,
  "metrics": {
    "health_resting_hr": {"value": 52, "unit": "bpm", "recorded_at": "2026-01-24T08:00:00Z"},
    "health_hrv": {"value": 45, "unit": "ms", "recorded_at": "2026-01-24T08:00:00Z"},
    "sleep_hours": {"value": 7.5, "unit": "hours", "recorded_at": "2026-01-23T08:00:00Z"},
    "steps": {"value": 8234, "unit": "count", "recorded_at": "2026-01-24T18:00:00Z"}
  },
  "insights": [
    "HRV is excellent (45ms) - great day for an intense HIIT session",
    "Well-rested with 7.5 hours - optimal conditions for fasting and exercise",
    "Recovery score is high - you're in peak performance state"
  ],
  "recovery": {
    "score": 82,
    "status": "excellent",
    "recommendation": "Ready for high-intensity workouts. Consider a challenging HIIT session."
  },
  "user_health_summary": {
    "resting_hr": 52,
    "hrv": 45,
    "sleep_average": 7.2,
    "activity_level": "moderate",
    "trend": "improving"
  },
  "recommendations": [
    "Maintain current sleep schedule - it's working great",
    "Try a 20:4 fasting window today given your energy level",
    "Schedule an advanced HIIT workout while recovery is high"
  ],
  "warnings": [],
  "last_7_days_summary": {
    "avg_sleep": 7.2,
    "avg_resting_hr": 54,
    "total_steps": 62450,
    "total_workouts": 4
  }
}
```

---

## State Machine: Health Permission Lifecycle

```
┌──────────┐
│ Not Set  │ User hasn't connected health app
└────┬─────┘
     │ tap "Connect"
     ▼
┌──────────────────┐
│ Permission       │ System permission dialog shown
│ Requested        │
└────┬─────────────┘
     │ User allows or denies
     ├─────────────────────────────┐
     ▼                             ▼
┌──────────────┐          ┌─────────────┐
│ Authorized   │          │ Denied      │
│ Syncing data │          │ No sync     │
└──────┬───────┘          └─────────────┘
       │
       ▼
┌──────────────────────┐
│ Can revoke anytime   │
│ Settings → Health    │
└──────────────────────┘
```

---

## AI Coach Integration

### Health Context in AI Coach Responses

When health data is available, the AI Coach can:
- **Assess recovery status** - Uses HRV + sleep to determine workout readiness
- **Adjust fasting recommendations** - Considers sleep quality and stress (HRV)
- **Personalize intensity** - Based on recent heart rate recovery and resting HR
- **Track trends** - Monitor improvements in recovery metrics over time

### Example Context Used

```python
health_context = {
    "has_data": True,
    "metrics": {
        "health_resting_hr": {
            "value": 52,
            "unit": "bpm",
            "recorded_at": "2026-01-24T08:00:00Z"
        },
        "health_hrv": {
            "value": 45,
            "unit": "ms",
            "recorded_at": "2026-01-24T08:00:00Z"
        },
        "sleep_hours": {
            "value": 7.5,
            "unit": "hours",
            "recorded_at": "2026-01-23T08:00:00Z"
        }
    },
    "insights": [
        "HRV is excellent - great day for an intense HIIT session",
        "Well-rested - optimal conditions for fasting and exercise"
    ]
}
```

---

## Security & Privacy

### Data Protection (PHI)

- All health metrics stored with `source=DEVICE_SYNC` for audit tracking
- Health data encrypted in transit (HTTPS only)
- Health data never logged or exposed in error messages
- Health data treated as Protected Health Information (PHI) under HIPAA/GDPR
- User can delete all health data with one tap (right to be forgotten)

### Permission Handling

**iOS:**
- Uses Apple HealthKit native permission system
- User must grant permission per metric type
- Permission revocation removes app's access immediately
- Health data remains user's property in Health app

**Android:**
- Uses Google Health Connect native permission system
- Granular permissions for each metric type
- Permission revocation via Settings → Apps
- Health data synced to Health Connect (user-controlled data)

### Audit Logging

All health data access is logged:
- Health data synced from device
- Health data viewed by AI Coach
- Health data exported by user
- Health permissions changed

---

## Testing

### Simulator Testing (Current)

```bash
cd apps/mobile
bun run start
# Press 'i' for iOS simulator
# Navigate to Settings → Health Data
# Observe: "Apple Health Unavailable" (expected - simulator limitation)
```

**Result:** HealthSyncCard UI displays correctly with proper error state.

### Physical Device Testing (Requires Apple Developer Account)

```bash
# 1. Sign up for Apple Developer Program ($99/year)
# 2. Build custom development client
eas build --profile development --platform ios

# 3. Install on physical iPhone via QR code
# 4. Open Apple Health app (add sample data if needed)
# 5. Launch UGOKI → Settings → Health Data
# 6. Tap "Connect Apple Health"
# 7. Grant permissions
# 8. Observe data syncing to backend

# Verify in browser:
curl https://api.ugoki.app/api/v1/health-sync/status \
  -H "Authorization: Bearer <token>"

# Response should show:
# {
#   "is_connected": true,
#   "last_sync": "2026-01-24T10:30:00Z",
#   "synced_metrics": ["health_heart_rate", "health_hrv", "sleep_hours"]
# }
```

---

## Known Limitations

1. **Simulator Only:** HealthKit only works on physical iOS devices with Apple Developer account
2. **Android Health Connect:** Requires Android 14+ or Health Connect app install
3. **Data Staleness:** Syncs occur when user manually triggers (no background sync yet)
4. **Historical Data:** Only syncs new data from permission grant time forward
5. **Metric Filtering:** Cannot query specific metric types via standard UI (must use API)

---

## Future Enhancements

- [ ] Background sync with `expo-background-fetch` (daily automatic sync)
- [ ] Workout auto-detection from device (Apple Workout app integration)
- [ ] Heart rate zone tracking during HIIT workouts
- [ ] Sleep quality correlation with fasting success analysis
- [ ] Trend anomaly detection (alert on unusual changes)
- [ ] Custom health metric goals (e.g., "improve RHR by 5 bpm")
- [ ] Export health data in standard formats (Apple Health XML, Google Takeout)

---

## References

- **Health Integration Guide:** [FITNESS_TOOLS.md](../FITNESS_TOOLS.md)
- **Security Standards:** [standards/SECURITY.md](../standards/SECURITY.md#health-data-protection-phi---protected-health-information)
- **Anti-Patterns:** [standards/ANTI_PATTERNS.md](../standards/ANTI_PATTERNS.md#health-data-without-source-column)
- **Module:** [MODULES.md - METRICS](../architecture/MODULES.md#metrics)
