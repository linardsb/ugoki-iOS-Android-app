# UGOKI Mobile App Guide

Mobile app development guide for the UGOKI Expo React Native application.

---

## Tech Stack

```
Framework:    Expo SDK 52 + React Native 0.76
UI:           Tamagui 1.141
State:        Zustand 5.0 + TanStack Query 5.0
Storage:      react-native-mmkv 3.2
Navigation:   Expo Router 4.0
Animations:   react-native-reanimated 3.16
```

---

## Feature Module Pattern

Each feature follows this structure:

```
features/{name}/
├── index.ts           # Re-exports
├── types.ts           # TypeScript types matching backend
├── hooks/
│   ├── index.ts       # Re-exports
│   └── use{Action}.ts # TanStack Query mutations/queries
├── components/        # Feature-specific components
└── stores/            # Feature-specific Zustand stores (if needed)
```

---

## Auth Flow

```
Welcome Screen → Create Anonymous Identity → Onboarding (3 steps) → Main App
                          ↓
                 POST /identity/authenticate
                 { provider: "anonymous", token: deviceId }
                          ↓
                 Store: identity, accessToken in MMKV
                          ↓
                 Onboarding saves:
                 - POST /profile (create)
                 - PATCH /profile/goals
                 - PATCH /profile/workout-restrictions
                 - PATCH /profile/preferences
```

---

## Key Files

| File | Purpose |
|------|---------|
| `shared/theme/tamagui.config.ts` | Theme colors, tokens, fonts |
| `shared/api/client.ts` | Axios instance with auth interceptors |
| `shared/api/query-client.ts` | TanStack Query client + typed query keys |
| `shared/stores/storage.ts` | MMKV storage with typed helpers |
| `shared/stores/auth.ts` | Auth state (identity, token, isAuthenticated) |
| `features/auth/hooks/useCreateAnonymous.ts` | Anonymous auth mutation |
| `features/profile/hooks/useSaveOnboarding.ts` | Combined onboarding mutation |
| `features/fasting/stores/fastingStore.ts` | Fasting timer state with pause/resume |
| `features/fasting/components/FastingTimer.tsx` | Animated circular progress timer |
| `features/fasting/components/FastingControls.tsx` | Start/pause/end fast controls |
| `features/dashboard/hooks/useProgression.ts` | Level, streaks, achievements queries |
| `features/dashboard/components/ActiveFastCard.tsx` | Live fasting timer on dashboard |

---

## Base UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppButton` | `shared/components/ui/` | Primary button with variants |
| `Card` | `shared/components/ui/` | Card container with press states |
| `Badge` | `shared/components/ui/` | Status badges with colors |
| `ProgressRing` | `shared/components/ui/` | Animated circular progress (for fasting) |
| `StatCard` | `shared/components/ui/` | Stats display with trends |
| `LoadingSpinner` | `shared/components/ui/` | Loading indicator |
| `EmptyState` | `shared/components/ui/` | Empty state with action |
| `ScreenHeader` | `shared/components/ui/` | Screen header with back button |
| `Avatar` | `shared/components/ui/` | User avatar with fallback |

---

## Dark Mode Color Palette

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Page background | `#121216` | `#fafafa` |
| Card background | `#1c1c1e` | `white` |
| Subtle background | `#2c2c2e` | `#f3f4f6` |
| Primary text | `#ffffff` | `#1f2937` |
| Muted text | `#a1a1aa` | `#6b7280` |
| Subtle text | `#71717a` | `#9ca3af` |
| Border color | `#2c2c2e` | `#e4e4e7` |
| Highlight (teal) | `#14b8a620` | `#d1fae5` |

### Theme Detection Pattern

```tsx
const colorScheme = useColorScheme();
const { mode: themeMode } = useThemeStore();
const systemTheme = colorScheme || 'light';
const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
const isDark = effectiveTheme === 'dark';

// Theme-aware colors
const cardBackground = isDark ? '#1c1c1e' : 'white';
const textColor = isDark ? '#ffffff' : '#1f2937';
```

### Key Rule

- **Theme backgrounds** → use `$color` or computed theme colors
- **White/light card backgrounds** → use hardcoded colors (`#1f2937` for text on white cards)

---

## EAS Build Setup

EAS (Expo Application Services) is configured for building and deploying the mobile app.

### Configuration Files

**eas.json** - Build profiles:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

**app.json** - Project linked to EAS:
- Project ID: `838f33cf-4bab-4cd9-b306-d6d4633f51cb`
- iOS encryption compliance: `usesNonExemptEncryption: false`

### Build Commands

```bash
cd apps/mobile

# Development build (with dev tools, for device testing)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (for TestFlight / internal testing)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production build (for App Store / Play Store)
eas build --profile production --platform ios
eas build --profile production --platform android

# Build both platforms
eas build --profile preview --platform all
```

### Build Profiles

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Dev client with debugging, hot reload | Internal (device) |
| `preview` | TestFlight / Internal testing | Internal |
| `production` | App Store / Play Store submission | Store |

### Prerequisites

1. **EAS CLI installed**: `npm install -g eas-cli`
2. **Logged into Expo**: `eas login`
3. **Apple Developer Account** (for iOS builds):
   - Must be active with no pending agreements
   - Visit https://developer.apple.com to resolve issues
4. **Google Play Console** (for Android production):
   - Service account key for automated submissions

### Troubleshooting

**"Apple Developer account needs to be updated"**
- Go to https://developer.apple.com
- Accept any new agreements
- Update payment/contact info if prompted

**Build without Apple account (alternatives):**
```bash
# Android build (no Apple needed)
eas build --profile preview --platform android

# Local iOS simulator build
eas build --profile development --platform ios --local
```

---

## Commands Reference

```bash
bun run start      # Start Expo
bun run ios        # iOS simulator
bun run android    # Android emulator
eas build          # Production build
```
