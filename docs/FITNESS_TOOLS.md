# Fitness Tools & Health Integration

This document covers the AI Coach's fitness tools and the Apple HealthKit / Android Health Connect integration.

---

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Mobile dependencies | ✅ Complete | `apps/mobile/package.json` |
| Expo plugins configured | ✅ Complete | `apps/mobile/app.json` |
| Health sync hook | ✅ Complete | `apps/mobile/features/health/hooks/useHealthSync.ts` |
| Health sync API | ✅ Complete | `apps/api/src/routes/health_sync.py` |
| FitnessTools health methods | ✅ Complete | `apps/api/src/modules/ai_coach/tools/fitness_tools.py` |
| Health settings UI | ✅ Complete | `apps/mobile/features/health/components/HealthSyncCard.tsx` |
| Settings screen integration | ✅ Complete | `apps/mobile/app/(modals)/settings.tsx` |
| iOS native project | ✅ Complete | `apps/mobile/ios/` |
| expo-dev-client | ✅ Complete | Required for native builds |
| Custom dev build | ⏳ Requires Apple Developer | `eas build --profile development` |
| Physical device testing | ⏳ Requires Apple Developer | $99/year account needed |
| Google Play approval | ⏳ Pending | ~2 weeks for Android production |

**Last Updated:** January 22, 2026

---

## Testing Status

### Simulator Testing (Current)

The health integration UI is visible in **Settings → Health Data** when running via Expo Go:

```bash
cd apps/mobile
npx expo start
# Press 'i' for iOS simulator
```

**Expected behavior in simulator:**
- HealthSyncCard displays "Apple Health Unavailable"
- This is correct - HealthKit only works on physical devices
- All other app features work normally

### Physical Device Testing (Requires Apple Developer Account)

To test actual HealthKit integration:

1. **Sign up for Apple Developer Program** ($99/year)
2. **Build development client:**
   ```bash
   cd apps/mobile
   eas build --profile development --platform ios
   ```
3. **Install on physical iPhone** via QR code from EAS
4. **Navigate to Settings → Health Data**
5. **Tap "Connect Apple Health"** - permission dialog appears
6. **Grant permissions** - data syncs to backend
7. **AI Coach** now uses health data for personalized recommendations

### What Works Without Apple Developer Account

| Feature | Expo Go | Requires Dev Account |
|---------|---------|---------------------|
| Health UI in Settings | ✅ | No |
| "Unavailable" state display | ✅ | No |
| All other app features | ✅ | No |
| HealthKit permissions | ❌ | Yes |
| Health data sync | ❌ | Yes |
| AI Coach health context | ❌ | Yes |

---

## Files Created/Modified

### Mobile App (`apps/mobile/`)

| File | Type | Description |
|------|------|-------------|
| `package.json` | Modified | Added health integration dependencies |
| `app.json` | Modified | Added Expo plugins and health permissions |
| `features/health/types.ts` | New | TypeScript types for health data |
| `features/health/hooks/useHealthSync.ts` | New | Unified hook for iOS/Android health sync |
| `features/health/hooks/index.ts` | New | Hook exports |
| `features/health/components/HealthSyncCard.tsx` | New | Settings UI component |
| `features/health/components/index.ts` | New | Component exports |
| `features/health/index.ts` | New | Feature barrel export |

### Backend API (`apps/api/`)

| File | Type | Description |
|------|------|-------------|
| `src/routes/health_sync.py` | New | REST endpoints for health sync |
| `src/main.py` | Modified | Registered health sync router |
| `src/modules/ai_coach/tools/fitness_tools.py` | Modified | Added health methods |

### Dependencies Added

**Mobile (`apps/mobile/package.json`):**
```json
{
  "@kingstinct/react-native-healthkit": "^13.1.0",
  "react-native-health-connect": "^3.5.0",
  "react-native-nitro-modules": "^0.33.2",
  "expo-health-connect": "^0.1.1",
  "expo-build-properties": "^1.0.10",
  "expo-dev-client": "^6.0.20"
}
```

### iOS Native Project (`apps/mobile/ios/`)

| File | Description |
|------|-------------|
| `Podfile` | Added ReactAppDependencyProvider workaround |
| `Podfile.properties.json` | New architecture enabled |
| `UGOKI/Info.plist` | HealthKit usage descriptions |
| `UGOKI/UGOKI.entitlements` | HealthKit entitlements |
| `ReactAppDependencyProvider/` | Workaround for expo-dev-launcher |

**HealthKit Entitlements (UGOKI.entitlements):**
```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.access</key>
<array/>
```

**Info.plist Permissions:**
```xml
<key>NSHealthShareUsageDescription</key>
<string>UGOKI uses your health data to personalize fitness coaching...</string>
<key>NSHealthUpdateUsageDescription</key>
<string>UGOKI records your workout sessions to track your progress.</string>
```

---

## Table of Contents

1. [Implementation Status](#implementation-status)
2. [Next Steps](#next-steps)
3. [Current FitnessTools Overview](#current-fitnesstools-overview)
4. [Health Integration Overview](#health-integration-overview)
5. [Recommended Libraries](#recommended-libraries)
6. [Data Type Mapping](#data-type-mapping)
7. [Implementation Architecture](#implementation-architecture)
8. [Implementation Guide](#implementation-guide)
9. [AI Coach Integration](#ai-coach-integration)
10. [Privacy & Compliance](#privacy--compliance)
11. [Google Play Approval](#google-play-approval)
12. [Cost Analysis](#cost-analysis)

---

## Next Steps

### 1. Sign Up for Apple Developer Program (When Ready)

To test HealthKit on a physical device, you need an Apple Developer account ($99/year):
- Sign up at [developer.apple.com](https://developer.apple.com)
- Required for: physical device testing, TestFlight, App Store

### 2. Build Custom Development Client

Once you have Apple Developer credentials:

```bash
cd apps/mobile

# Build development client for iOS
eas build --profile development --platform ios

# Build development client for Android
eas build --profile development --platform android

# Or both platforms
eas build --profile development --platform all
```

The EAS CLI will prompt for Apple credentials during the iOS build.

### 3. HealthSyncCard Integration (✅ Complete)

The HealthSyncCard is already integrated in `app/(modals)/settings.tsx`:

```tsx
// Already added to settings.tsx
import { HealthSyncCard } from '@/features/health';

// In the Health Data section:
<SettingsSection title="Health Data">
  <YStack gap="$3">
    <HealthSyncCard />
    {/* Bloodwork button */}
  </YStack>
</SettingsSection>
```

### 3. Test on Physical Devices

Health data APIs only work on physical devices with health data:

**iOS Testing:**
1. Install dev build on iPhone
2. Open Apple Health app, add sample data if needed
3. Launch UGOKI, go to settings
4. Tap "Connect Apple Health"
5. Grant permissions in system dialog
6. Verify data syncs

**Android Testing:**
1. Install Health Connect app from Play Store (if Android < 14)
2. Install dev build on Android device
3. Launch UGOKI, go to settings
4. Tap "Connect Health Connect"
5. Grant permissions
6. Verify data syncs

### 4. Submit Google Play Health Connect Declaration (For Production)

Before releasing to Google Play:

1. Go to **Google Play Console** → Your App → **App content**
2. Navigate to **Health Connect** section
3. Complete the declaration form:
   - List all health data types you access
   - Explain purpose of each data type
   - Link to privacy policy
4. Submit for review

**Timeline:**
- Review: ~7 days
- Whitelist propagation: ~5-7 days
- **Total: ~2 weeks**

### 5. Update Privacy Policy

Add health data handling to your privacy policy. Required disclosures:

```markdown
## Health Data

UGOKI collects the following health data when you connect Apple Health or Google Health Connect:

- **Heart Rate & HRV**: Used to assess recovery and recommend workout intensity
- **Sleep Duration**: Used to personalize fasting windows and workout recommendations
- **Steps & Calories**: Used to track daily activity and adjust coaching
- **Weight & Body Fat**: Used to track progress toward fitness goals

This data is:
- Stored securely on our servers
- Never sold to third parties
- Used only to personalize your UGOKI experience
- Deletable upon request through account settings
```

### 6. Integrate Health Context into AI Coach (Optional Enhancement)

The FitnessTools already have health methods. To use them in AI Coach responses:

```python
# In AI Coach service, when building context:
health_context = await tools.get_health_context()
recovery = await tools.get_recovery_status()

if health_context.get("has_data"):
    system_context += f"""

User's Health Status:
- Resting HR: {health_context['metrics'].get('health_resting_hr', {}).get('value', 'N/A')} bpm
- HRV: {health_context['metrics'].get('health_hrv', {}).get('value', 'N/A')} ms
- Sleep: {health_context['metrics'].get('sleep_hours', {}).get('value', 'N/A')} hours
- Recovery: {recovery.get('status', 'unknown')} ({recovery.get('recovery_score', 'N/A')}/100)

Insights: {', '.join(health_context.get('insights', []))}
"""
```

---

## Cost Analysis

### Monthly Costs (50 Daily Active Users)

| Item | Cost |
|------|------|
| AI tokens (health context) | ~$0.90-1.80 |
| Infrastructure | ~$1-2 |
| **Total** | **~$2-4/month** |

### One-Time Costs

| Item | Cost |
|------|------|
| Development | $0 (implemented) |
| Libraries | $0 (MIT licensed) |
| Privacy policy update | $0 (DIY) |
| **Total** | **$0** |

---

## Current FitnessTools Overview

The `FitnessTools` class (`apps/api/src/modules/ai_coach/tools/fitness_tools.py`) provides the AI Coach with access to user fitness data.

### Existing Methods

| Method | Description | Data Source |
|--------|-------------|-------------|
| `get_active_fast()` | Current fasting session status | TimeKeeperService |
| `get_streaks()` | User's activity streaks | ProgressionService |
| `get_level_info()` | XP and level progression | ProgressionService |
| `get_workout_stats()` | Workout history statistics | ContentService |
| `get_recommended_workouts()` | Personalized workout suggestions | ContentService |
| `get_weight_trend()` | Weight change over time | MetricsService |
| `get_today_summary()` | Combined daily overview | Multiple services |
| `get_latest_biomarkers()` | Blood test results | MetricsService |
| `get_biomarker_trend()` | Historical biomarker data | MetricsService |
| `get_bloodwork_summary()` | Categorized health status | MetricsService |

### Health Device Methods (New)

| Method | Description | Data Source |
|--------|-------------|-------------|
| `get_health_context()` | Latest health metrics from connected devices | MetricsService (DEVICE_SYNC) |
| `get_recovery_status()` | Recovery score and workout readiness | MetricsService + algorithm |
| `get_health_summary()` | Combined device health + bloodwork | Multiple sources |

### Usage Example

```python
from src.modules.ai_coach.tools.fitness_tools import FitnessTools

tools = FitnessTools(db=session, identity_id=user_id)
summary = await tools.get_today_summary()
```

---

## Health Integration Overview

Integrating Apple HealthKit and Android Health Connect enables the AI Coach to access real-time health data from wearables and smartphones, providing more personalized coaching.

### Benefits for UGOKI

| Feature | Without Health Integration | With Health Integration |
|---------|---------------------------|------------------------|
| Workout recommendations | Based on history only | Based on recovery status, sleep, HRV |
| Fasting guidance | Generic timing | Adjusted for sleep quality and stress |
| Recovery insights | Manual input required | Automatic from wearable data |
| Personalization | Limited | Real-time biometric context |

### Supported Data Types

**For Intermittent Fasting (IF):**
- Sleep duration and quality (fasting windows correlate with sleep)
- Resting metabolic rate (calorie burn during fasts)
- Weight and body composition trends
- HRV (indicates metabolic state)

**For HIIT Workouts:**
- Heart rate (real-time intensity zones)
- Heart rate recovery (post-workout fitness indicator)
- HRV (pre-workout readiness assessment)
- Active calories burned
- Exercise session logging

---

## Recommended Libraries

### iOS: @kingstinct/react-native-healthkit

**Version:** 13.1.0 (December 2025)

**Features:**
- Full TypeScript support with Promise-based API
- Built-in Expo config plugin
- 100+ quantity types, 63 category types, 75+ workout types
- Active maintenance

**Installation:**
```bash
bun add @kingstinct/react-native-healthkit react-native-nitro-modules
```

**Expo Configuration:**
```json
{
  "expo": {
    "plugins": ["@kingstinct/react-native-healthkit"]
  }
}
```

### Android: react-native-health-connect

**Version:** 3.5.0 (November 2025)

**Requirements:**
- React Native 0.71+
- minSdkVersion 26 (Android 8.0+)
- compileSdkVersion 34+
- Health Connect app installed (pre-installed on Android 14+)

**Installation:**
```bash
bun add react-native-health-connect
bun add -d expo-health-connect expo-build-properties
```

**Expo Configuration:**
```json
{
  "expo": {
    "plugins": [
      "expo-health-connect",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 34,
            "minSdkVersion": 26
          }
        }
      ]
    ]
  }
}
```

### Important Notes

- Both libraries require **custom development builds** (not Expo Go)
- No official Expo SDK modules exist for comprehensive health data
- `expo-pedometer` exists for basic step counting only

---

## Data Type Mapping

### Cross-Platform Mapping

| Health Metric | Apple HealthKit Identifier | Android Health Connect Record | UGOKI metric_type |
|---------------|---------------------------|------------------------------|-------------------|
| Heart Rate | `heartRate` | `HeartRateRecord` | `health_heart_rate` |
| Resting HR | `restingHeartRate` | (derived from HeartRateRecord) | `health_resting_hr` |
| HRV | `heartRateVariabilitySDNN` | `HeartRateVariabilityRmssdRecord` | `health_hrv` |
| Sleep | `sleepAnalysis` | `SleepSessionRecord` | `sleep_hours` |
| Active Calories | `activeEnergyBurned` | `ActiveCaloriesBurnedRecord` | `calories_burned` |
| Steps | `stepCount` | `StepsRecord` | `steps` |
| Weight | `bodyMass` | `WeightRecord` | `weight_kg` |
| Body Fat | `bodyFatPercentage` | `BodyFatRecord` | `body_fat_pct` |
| HIIT Workout | `highIntensityIntervalTraining` | `EXERCISE_SESSION_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING` | `workout_minutes` |

### Apple HealthKit Constants

```swift
// Heart Rate
HKQuantityTypeIdentifier.heartRate
HKQuantityTypeIdentifier.restingHeartRate
HKQuantityTypeIdentifier.walkingHeartRateAverage
HKQuantityTypeIdentifier.heartRateRecoveryOneMinute
HKQuantityTypeIdentifier.heartRateVariabilitySDNN

// Sleep (Category Type)
HKCategoryTypeIdentifier.sleepAnalysis
// Values: .inBed, .awake, .asleepCore, .asleepDeep, .asleepREM

// Energy
HKQuantityTypeIdentifier.activeEnergyBurned
HKQuantityTypeIdentifier.basalEnergyBurned

// Activity
HKQuantityTypeIdentifier.stepCount
HKQuantityTypeIdentifier.appleExerciseTime

// Body
HKQuantityTypeIdentifier.bodyMass
HKQuantityTypeIdentifier.bodyFatPercentage
HKQuantityTypeIdentifier.bodyMassIndex

// HIIT Workout Type
HKWorkoutActivityType.highIntensityIntervalTraining
```

### Android Health Connect Constants

```kotlin
// Records
HeartRateRecord
HeartRateVariabilityRmssdRecord
SleepSessionRecord
ActiveCaloriesBurnedRecord
TotalCaloriesBurnedRecord
BasalMetabolicRateRecord
StepsRecord
WeightRecord
BodyFatRecord
ExerciseSessionRecord

// Sleep Stages
SleepSessionRecord.Stage.STAGE_TYPE_AWAKE
SleepSessionRecord.Stage.STAGE_TYPE_LIGHT
SleepSessionRecord.Stage.STAGE_TYPE_DEEP
SleepSessionRecord.Stage.STAGE_TYPE_REM

// Exercise Types
ExerciseSessionType.EXERCISE_SESSION_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
ExerciseSessionType.EXERCISE_SESSION_TYPE_STRENGTH_TRAINING
ExerciseSessionType.EXERCISE_SESSION_TYPE_RUNNING
```

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App                                │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   HealthKit     │    │  Health Connect  │                    │
│  │   (iOS)         │    │   (Android)      │                    │
│  └────────┬────────┘    └────────┬─────────┘                    │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      ▼                                           │
│           ┌─────────────────────┐                                │
│           │  useHealthSync()    │  ◄── Unified hook              │
│           │  Platform adapter   │                                │
│           └──────────┬──────────┘                                │
│                      │                                           │
└──────────────────────┼───────────────────────────────────────────┘
                       │ POST /health-sync
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Backend API                                │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │  Health Sync    │───▶│ MetricsService  │                      │
│  │  Endpoint       │    │ (existing)      │                      │
│  └─────────────────┘    └────────┬────────┘                      │
│                                  │                                │
│                                  ▼                                │
│                        ┌─────────────────┐                        │
│                        │  FitnessTools   │                        │
│                        │  + Health Data  │                        │
│                        └────────┬────────┘                        │
│                                 │                                 │
│                                 ▼                                 │
│                        ┌─────────────────┐                        │
│                        │   AI Coach      │                        │
│                        │   (enhanced)    │                        │
│                        └─────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Mobile** requests health permissions from user
2. **Mobile** reads data from HealthKit/Health Connect
3. **Mobile** syncs data to backend via `POST /health-sync`
4. **Backend** stores in MetricsService with `source=DEVICE_SYNC`
5. **FitnessTools** retrieves health data for AI Coach context
6. **AI Coach** provides personalized recommendations

---

## Implementation Guide

### Phase 1: Mobile Setup

**Update `apps/mobile/app.json`:**

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-splash-screen",
      "@kingstinct/react-native-healthkit",
      "expo-health-connect",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 34,
            "minSdkVersion": 26
          }
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#14b8a6"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "UGOKI needs access to your photos to upload bloodwork results."
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "UGOKI needs microphone access for workout audio cues."
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.ugoki.app",
      "infoPlist": {
        "NSCameraUsageDescription": "UGOKI needs camera access to take photos of your bloodwork results.",
        "NSPhotoLibraryUsageDescription": "UGOKI needs photo library access to upload bloodwork results.",
        "NSHealthShareUsageDescription": "UGOKI uses your health data to personalize your fitness coaching based on sleep, heart rate, and activity levels.",
        "NSHealthUpdateUsageDescription": "UGOKI records your workout sessions to track your progress.",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.ugoki.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_SLEEP",
        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.READ_WEIGHT",
        "android.permission.health.READ_BODY_FAT",
        "android.permission.health.READ_HEART_RATE_VARIABILITY"
      ]
    }
  }
}
```

### Phase 2: Mobile Hook

**Create `apps/mobile/features/health/hooks/useHealthSync.ts`:**

```typescript
import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

// Platform-specific imports
const HealthKit = Platform.OS === 'ios'
  ? require('@kingstinct/react-native-healthkit').default
  : null;
const HealthConnect = Platform.OS === 'android'
  ? require('react-native-health-connect')
  : null;

export interface HealthData {
  heartRate?: { value: number; timestamp: Date }[];
  restingHeartRate?: number;
  hrv?: number;
  sleepHours?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  steps?: number;
  activeCalories?: number;
  weight?: number;
  bodyFat?: number;
}

export interface UseHealthSyncReturn {
  isAvailable: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  fetchHealthData: (days?: number) => Promise<HealthData>;
  syncToBackend: (data: HealthData) => Promise<void>;
}

export function useHealthSync(): UseHealthSyncReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        if (Platform.OS === 'ios' && HealthKit) {
          const available = await HealthKit.isHealthDataAvailable();
          setIsAvailable(available);
        } else if (Platform.OS === 'android' && HealthConnect) {
          const status = await HealthConnect.getSdkStatus();
          setIsAvailable(status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
        }
      } catch (err) {
        setError('Failed to check health data availability');
      }
    };
    checkAvailability();
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'ios' && HealthKit) {
        const permissions = {
          read: [
            HealthKit.HKQuantityTypeIdentifier.heartRate,
            HealthKit.HKQuantityTypeIdentifier.restingHeartRate,
            HealthKit.HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
            HealthKit.HKQuantityTypeIdentifier.stepCount,
            HealthKit.HKQuantityTypeIdentifier.activeEnergyBurned,
            HealthKit.HKQuantityTypeIdentifier.bodyMass,
            HealthKit.HKQuantityTypeIdentifier.bodyFatPercentage,
            HealthKit.HKCategoryTypeIdentifier.sleepAnalysis,
          ],
          write: [],
        };
        await HealthKit.requestAuthorization(permissions);
        setIsAuthorized(true);
        return true;
      } else if (Platform.OS === 'android' && HealthConnect) {
        const permissions = [
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'Weight' },
          { accessType: 'read', recordType: 'BodyFat' },
          { accessType: 'read', recordType: 'SleepSession' },
        ];
        const granted = await HealthConnect.requestPermission(permissions);
        const authorized = granted.length > 0;
        setIsAuthorized(authorized);
        return authorized;
      }
      return false;
    } catch (err) {
      setError('Failed to request health permissions');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch health data from device
  const fetchHealthData = useCallback(async (days: number = 7): Promise<HealthData> => {
    setIsLoading(true);
    setError(null);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data: HealthData = {};

    try {
      if (Platform.OS === 'ios' && HealthKit) {
        // Heart Rate samples
        const hrSamples = await HealthKit.queryQuantitySamples(
          HealthKit.HKQuantityTypeIdentifier.heartRate,
          { from: startDate, to: endDate }
        );
        data.heartRate = hrSamples.map((s: any) => ({
          value: s.quantity,
          timestamp: new Date(s.startDate),
        }));

        // Resting Heart Rate (latest)
        const restingHR = await HealthKit.getMostRecentQuantitySample(
          HealthKit.HKQuantityTypeIdentifier.restingHeartRate
        );
        data.restingHeartRate = restingHR?.quantity;

        // HRV (latest)
        const hrv = await HealthKit.getMostRecentQuantitySample(
          HealthKit.HKQuantityTypeIdentifier.heartRateVariabilitySDNN
        );
        data.hrv = hrv?.quantity;

        // Steps (today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const steps = await HealthKit.queryQuantitySamples(
          HealthKit.HKQuantityTypeIdentifier.stepCount,
          { from: todayStart, to: endDate }
        );
        data.steps = steps.reduce((sum: number, s: any) => sum + s.quantity, 0);

        // Active calories (today)
        const calories = await HealthKit.queryQuantitySamples(
          HealthKit.HKQuantityTypeIdentifier.activeEnergyBurned,
          { from: todayStart, to: endDate }
        );
        data.activeCalories = calories.reduce((sum: number, s: any) => sum + s.quantity, 0);

        // Weight (latest)
        const weight = await HealthKit.getMostRecentQuantitySample(
          HealthKit.HKQuantityTypeIdentifier.bodyMass
        );
        data.weight = weight?.quantity;

        // Body fat (latest)
        const bodyFat = await HealthKit.getMostRecentQuantitySample(
          HealthKit.HKQuantityTypeIdentifier.bodyFatPercentage
        );
        data.bodyFat = bodyFat ? bodyFat.quantity * 100 : undefined; // Convert to percentage

        // Sleep (last night)
        const yesterdayEvening = new Date();
        yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
        yesterdayEvening.setHours(18, 0, 0, 0);
        const sleep = await HealthKit.queryCategorySamples(
          HealthKit.HKCategoryTypeIdentifier.sleepAnalysis,
          { from: yesterdayEvening, to: endDate }
        );
        data.sleepHours = calculateSleepHours(sleep);
        data.sleepQuality = calculateSleepQuality(data.sleepHours);

      } else if (Platform.OS === 'android' && HealthConnect) {
        // Heart Rate
        const hrRecords = await HealthConnect.readRecords('HeartRate', {
          timeRangeFilter: {
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
          }
        });
        data.heartRate = hrRecords.records.flatMap((r: any) =>
          r.samples.map((s: any) => ({
            value: s.beatsPerMinute,
            timestamp: new Date(s.time)
          }))
        );

        // Calculate resting HR from lowest readings
        if (data.heartRate && data.heartRate.length > 0) {
          const sortedHR = [...data.heartRate].sort((a, b) => a.value - b.value);
          const lowestReadings = sortedHR.slice(0, Math.ceil(sortedHR.length * 0.1));
          data.restingHeartRate = lowestReadings.reduce((sum, r) => sum + r.value, 0) / lowestReadings.length;
        }

        // HRV
        const hrvRecords = await HealthConnect.readRecords('HeartRateVariabilityRmssd', {
          timeRangeFilter: {
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
          }
        });
        if (hrvRecords.records.length > 0) {
          const latest = hrvRecords.records[hrvRecords.records.length - 1];
          data.hrv = latest.heartRateVariabilityMillis;
        }

        // Steps
        const stepsRecords = await HealthConnect.readRecords('Steps', {
          timeRangeFilter: {
            startTime: new Date(new Date().setHours(0,0,0,0)).toISOString(),
            endTime: endDate.toISOString()
          }
        });
        data.steps = stepsRecords.records.reduce((sum: number, r: any) => sum + r.count, 0);

        // Active calories
        const calorieRecords = await HealthConnect.readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: {
            startTime: new Date(new Date().setHours(0,0,0,0)).toISOString(),
            endTime: endDate.toISOString()
          }
        });
        data.activeCalories = calorieRecords.records.reduce(
          (sum: number, r: any) => sum + r.energy.inKilocalories, 0
        );

        // Weight
        const weightRecords = await HealthConnect.readRecords('Weight', {
          timeRangeFilter: {
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
          }
        });
        if (weightRecords.records.length > 0) {
          const latest = weightRecords.records[weightRecords.records.length - 1];
          data.weight = latest.weight.inKilograms;
        }

        // Body fat
        const bodyFatRecords = await HealthConnect.readRecords('BodyFat', {
          timeRangeFilter: {
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
          }
        });
        if (bodyFatRecords.records.length > 0) {
          const latest = bodyFatRecords.records[bodyFatRecords.records.length - 1];
          data.bodyFat = latest.percentage;
        }

        // Sleep
        const sleepRecords = await HealthConnect.readRecords('SleepSession', {
          timeRangeFilter: {
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endTime: endDate.toISOString()
          }
        });
        if (sleepRecords.records.length > 0) {
          const totalMs = sleepRecords.records.reduce((sum: number, r: any) => {
            return sum + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime());
          }, 0);
          data.sleepHours = totalMs / (1000 * 60 * 60);
          data.sleepQuality = calculateSleepQuality(data.sleepHours);
        }
      }

      return data;
    } catch (err) {
      setError('Failed to fetch health data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync data to backend
  const syncToBackend = useCallback(async (data: HealthData): Promise<void> => {
    // Implementation depends on your API client
    // Example:
    // await api.post('/health-sync', {
    //   resting_heart_rate: data.restingHeartRate,
    //   hrv: data.hrv,
    //   sleep_hours: data.sleepHours,
    //   steps: data.steps,
    //   active_calories: data.activeCalories,
    //   weight_kg: data.weight,
    //   body_fat_pct: data.bodyFat,
    //   synced_at: new Date().toISOString(),
    // });
  }, []);

  return {
    isAvailable,
    isAuthorized,
    isLoading,
    error,
    requestPermissions,
    fetchHealthData,
    syncToBackend,
  };
}

// Helper functions
function calculateSleepHours(samples: any[]): number {
  // Filter for actual sleep states (not just in bed)
  const sleepSamples = samples.filter(s => s.value !== 0);
  const totalMs = sleepSamples.reduce((sum, s) => {
    return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
  }, 0);
  return totalMs / (1000 * 60 * 60);
}

function calculateSleepQuality(hours: number | undefined): 'poor' | 'fair' | 'good' | 'excellent' {
  if (!hours) return 'poor';
  if (hours >= 8) return 'excellent';
  if (hours >= 7) return 'good';
  if (hours >= 6) return 'fair';
  return 'poor';
}
```

### Phase 3: Backend Endpoint

**Create `apps/api/src/routes/health_sync.py`:**

```python
"""Health data sync endpoints for mobile device integration."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from src.core.deps import get_db, get_current_identity
from src.modules.metrics.service import MetricsService
from src.modules.metrics.models import MetricSource

router = APIRouter(prefix="/health-sync", tags=["health"])


class HealthDataPayload(BaseModel):
    """Payload for syncing health data from mobile devices."""
    resting_heart_rate: Optional[float] = None
    hrv: Optional[float] = None
    sleep_hours: Optional[float] = None
    steps: Optional[int] = None
    active_calories: Optional[float] = None
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    synced_at: datetime


class SyncResponse(BaseModel):
    """Response after syncing health data."""
    synced: list[str]
    timestamp: datetime


@router.post("/", response_model=SyncResponse)
async def sync_health_data(
    payload: HealthDataPayload,
    db=Depends(get_db),
    identity=Depends(get_current_identity),
):
    """
    Receive health data from mobile device and store in metrics.

    Data is stored with source=DEVICE_SYNC to distinguish from manual input.
    """
    service = MetricsService(db)
    stored = []

    # Map payload fields to metric types
    metric_mappings = [
        ("health_resting_hr", payload.resting_heart_rate, "bpm"),
        ("health_hrv", payload.hrv, "ms"),
        ("sleep_hours", payload.sleep_hours, "hours"),
        ("steps", payload.steps, "count"),
        ("calories_burned", payload.active_calories, "kcal"),
        ("weight_kg", payload.weight_kg, "kg"),
        ("body_fat_pct", payload.body_fat_pct, "%"),
    ]

    for metric_type, value, unit in metric_mappings:
        if value is not None:
            await service.record(
                identity_id=identity.id,
                metric_type=metric_type,
                value=float(value),
                unit=unit,
                source=MetricSource.DEVICE_SYNC,
                timestamp=payload.synced_at,
            )
            stored.append(metric_type)

    return SyncResponse(synced=stored, timestamp=payload.synced_at)


@router.get("/status")
async def get_sync_status(
    db=Depends(get_db),
    identity=Depends(get_current_identity),
):
    """Get the status of health data sync for the current user."""
    service = MetricsService(db)

    # Check for recent device-synced metrics
    health_metrics = ["health_resting_hr", "health_hrv", "sleep_hours", "steps"]
    latest_sync = None
    synced_metrics = []

    for metric_type in health_metrics:
        latest = await service.get_latest(identity.id, metric_type)
        if latest and latest.source == MetricSource.DEVICE_SYNC:
            synced_metrics.append(metric_type)
            if latest_sync is None or latest.timestamp > latest_sync:
                latest_sync = latest.timestamp

    return {
        "is_connected": len(synced_metrics) > 0,
        "last_sync": latest_sync.isoformat() if latest_sync else None,
        "synced_metrics": synced_metrics,
    }
```

**Register the router in `apps/api/src/main.py`:**

```python
from src.routes.health_sync import router as health_sync_router

app.include_router(health_sync_router)
```

### Phase 4: Extend FitnessTools

**Add to `apps/api/src/modules/ai_coach/tools/fitness_tools.py`:**

```python
# Add these methods to the FitnessTools class

async def get_health_context(self) -> dict:
    """Get user's recent health data for AI context."""
    service = MetricsService(self.db)

    health_metrics = {}

    metric_types = [
        ("health_resting_hr", "Resting Heart Rate", "bpm"),
        ("health_hrv", "Heart Rate Variability", "ms"),
        ("sleep_hours", "Last Night's Sleep", "hours"),
        ("steps", "Today's Steps", "steps"),
    ]

    for metric_type, label, unit in metric_types:
        latest = await service.get_latest(self.identity_id, metric_type)
        if latest:
            health_metrics[metric_type] = {
                "label": label,
                "value": latest.value,
                "unit": unit,
                "recorded_at": latest.timestamp.isoformat(),
            }

    if not health_metrics:
        return {
            "has_data": False,
            "message": "No health device connected. Connect Apple Health or Google Health Connect for personalized insights."
        }

    return {
        "has_data": True,
        "metrics": health_metrics,
        "insights": self._generate_health_insights(health_metrics),
    }

def _generate_health_insights(self, metrics: dict) -> list[str]:
    """Generate actionable insights from health data."""
    insights = []

    # HRV-based recovery insight
    if hrv := metrics.get("health_hrv"):
        if hrv["value"] < 30:
            insights.append("HRV is low - consider a lighter workout or active recovery today")
        elif hrv["value"] > 60:
            insights.append("HRV is excellent - great day for an intense HIIT session")

    # Sleep-based insight
    if sleep := metrics.get("sleep_hours"):
        if sleep["value"] < 6:
            insights.append(f"Only {sleep['value']:.1f}h sleep - consider extending your fasting window to support recovery")
        elif sleep["value"] >= 7.5:
            insights.append("Well-rested - optimal conditions for fasting and exercise")

    # Resting HR trend insight
    if rhr := metrics.get("health_resting_hr"):
        if rhr["value"] > 75:
            insights.append("Elevated resting HR may indicate stress or incomplete recovery")

    return insights

async def get_recovery_status(self) -> dict:
    """Assess user's recovery readiness based on health data."""
    service = MetricsService(self.db)

    # Get recent HRV trend
    hrv_trend = await service.get_trend(
        self.identity_id, "health_hrv", period_days=7
    )

    # Get recent sleep average
    sleep_history = await service.get_history(
        self.identity_id, "sleep_hours", limit=7
    )
    avg_sleep = sum(m.value for m in sleep_history) / len(sleep_history) if sleep_history else None

    # Calculate recovery score (0-100)
    score = 50  # baseline

    if hrv_trend and hrv_trend.direction.value == "up":
        score += 20
    elif hrv_trend and hrv_trend.direction.value == "down":
        score -= 15

    if avg_sleep:
        if avg_sleep >= 7.5:
            score += 20
        elif avg_sleep < 6:
            score -= 20

    score = max(0, min(100, score))

    return {
        "recovery_score": score,
        "status": "excellent" if score >= 80 else "good" if score >= 60 else "moderate" if score >= 40 else "needs_rest",
        "recommendation": self._get_recovery_recommendation(score),
    }

def _get_recovery_recommendation(self, score: int) -> str:
    """Get workout recommendation based on recovery score."""
    if score >= 80:
        return "Fully recovered - great day for high-intensity training"
    elif score >= 60:
        return "Good recovery - moderate intensity recommended"
    elif score >= 40:
        return "Partial recovery - consider lighter activity or longer fast"
    else:
        return "Rest recommended - focus on sleep and gentle movement"
```

---

## AI Coach Integration

With health data available, the AI Coach can provide more personalized recommendations.

### Enhanced System Prompt Context

```python
# In AI Coach service, include health context in system prompt

health_context = await tools.get_health_context()
recovery = await tools.get_recovery_status()

context = f"""
User's Current Health Status:
- Resting HR: {health_context['metrics'].get('health_resting_hr', {}).get('value', 'N/A')} bpm
- HRV: {health_context['metrics'].get('health_hrv', {}).get('value', 'N/A')} ms
- Last night's sleep: {health_context['metrics'].get('sleep_hours', {}).get('value', 'N/A')} hours
- Recovery Status: {recovery['status']} (score: {recovery['recovery_score']}/100)

Health Insights:
{chr(10).join(f'- {insight}' for insight in health_context.get('insights', []))}

Recommendation: {recovery['recommendation']}
"""
```

### Example AI Coach Responses

**With poor recovery:**
> "I notice your HRV is lower than usual and you only got 5.5 hours of sleep. Today might be a good day for active recovery - a light walk or gentle stretching. Consider extending your fasting window to give your body extra recovery time."

**With good recovery:**
> "Your recovery metrics look great! HRV is up 15% from last week and you got solid sleep. This is an ideal day for that HIIT workout we've been building up to. Ready to crush it?"

---

## Privacy & Compliance

### Data Handling Requirements

1. **User Consent**: Always request explicit permission before accessing health data
2. **Data Minimization**: Only request access to data types you actually use
3. **Secure Storage**: Health data is PHI - encrypt in transit and at rest
4. **Audit Logging**: Log all health data access for compliance
5. **Data Retention**: Define and enforce retention policies
6. **User Control**: Allow users to revoke access and delete their health data

### iOS Info.plist Requirements

```xml
<key>NSHealthShareUsageDescription</key>
<string>UGOKI uses your health data to personalize your fitness coaching based on sleep, heart rate, and activity levels.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>UGOKI records your workout sessions to track your progress.</string>
```

### Android Privacy Policy

For Health Connect integration, you must:
1. Include health data handling in your privacy policy
2. Explain what data you collect and why
3. Describe how data is stored and protected
4. Provide instructions for data deletion

---

## Google Play Approval

### Timeline

| Step | Duration |
|------|----------|
| Submit declaration form | Day 0 |
| Google review | ~7 days |
| Whitelist propagation | ~5-7 days |
| **Total** | **~12-14 days** |

### Declaration Form Requirements

1. Navigate to Google Play Console > App content > Health Connect
2. Complete the permissions declaration form
3. Explain each permission's purpose
4. Link to privacy policy with health data handling
5. Submit for review

### Testing Before Approval

While waiting for approval, you can test with:
- Debug builds (no approval needed)
- Internal testing track
- Closed testing track (limited users)

---

## Implementation Timeline

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1 | 1 day | Mobile setup, permissions, dependencies |
| Phase 2 | 1-2 days | Mobile hook with platform adapters |
| Phase 3 | 0.5 days | Backend sync endpoint |
| Phase 4 | 0.5 days | FitnessTools health methods |
| Testing | 1 day | Integration testing, permissions flow |
| **Total** | **4-5 days** | Basic integration complete |

### Future Enhancements

- Background sync with `expo-background-fetch`
- Workout auto-detection and logging
- Heart rate zone tracking during HIIT
- Sleep quality correlation with fasting success
- Trend analysis and anomaly detection
