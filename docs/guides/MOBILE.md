# Mobile Development Guide

Development guide for the UGOKI Expo React Native mobile app.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.76 |
| Platform | Expo SDK 52 |
| UI Library | Tamagui 1.141 |
| State | Zustand 5.0 |
| Data Fetching | TanStack Query 5.0 |
| Navigation | Expo Router 4.0 |
| Storage | AsyncStorage |
| Animations | react-native-reanimated 3.16 |

---

## Project Structure

```
apps/mobile/
├── app/                           # Expo Router screens
│   ├── _layout.tsx                # Root layout
│   ├── (auth)/                    # Auth flow
│   │   ├── welcome.tsx
│   │   ├── onboarding.tsx
│   │   └── login.tsx
│   ├── (tabs)/                    # Main tab navigator
│   │   ├── _layout.tsx
│   │   ├── index.tsx              # Dashboard
│   │   ├── workouts.tsx
│   │   ├── coach.tsx
│   │   └── profile.tsx
│   └── (modals)/                  # Modal screens
│       ├── settings.tsx
│       ├── workout/[id].tsx
│       └── bloodwork/
├── features/                      # Feature modules
│   ├── auth/
│   ├── fasting/
│   ├── workouts/
│   ├── coach/
│   ├── dashboard/
│   ├── profile/
│   ├── bloodwork/
│   ├── research/
│   └── social/
├── shared/                        # Shared utilities
│   ├── api/                       # API client
│   ├── components/                # Shared components
│   ├── stores/                    # Global stores
│   └── theme/                     # Tamagui config
├── assets/                        # Images, fonts
└── app.json                       # Expo config
```

---

## Commands

```bash
# Install dependencies
bun install

# Start Expo dev server
bun run start

# Start with cache clear
bun run start --clear

# iOS simulator
bun run ios

# Android emulator
bun run android

# Run tests
bun run test

# Type check
bun run typecheck

# Lint
bun run lint
```

---

## Feature Module Pattern

Each feature follows this structure:

```
features/{name}/
├── index.ts              # Re-exports
├── types.ts              # TypeScript types
├── hooks/
│   ├── index.ts          # Re-exports
│   └── use{Action}.ts    # React Query hooks
├── components/           # Feature components
│   ├── index.ts
│   └── {Component}.tsx
└── stores/               # Zustand stores (if needed)
    └── {name}Store.ts
```

### Creating a New Feature

```bash
mkdir -p features/my-feature/{hooks,components}
touch features/my-feature/{index,types}.ts
touch features/my-feature/hooks/{index,useMyFeature}.ts
```

---

## React Query Patterns

### Query Hook

```typescript
// features/my-feature/hooks/useMyFeature.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';

export function useMyFeature(id: string) {
  return useQuery({
    queryKey: queryKeys.myFeature.detail(id),
    queryFn: () => api.get(`/my-feature/${id}`).then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Mutation Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateMyFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRequest) =>
      api.post('/my-feature', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myFeature.all });
    },
  });
}
```

### Query Keys

```typescript
// shared/api/query-client.ts
export const queryKeys = {
  myFeature: {
    all: ['my-feature'] as const,
    lists: () => [...queryKeys.myFeature.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.myFeature.all, 'detail', id] as const,
  },
};
```

---

## Zustand Patterns

### Basic Store

```typescript
// features/my-feature/stores/myFeatureStore.ts
import { create } from 'zustand';

interface MyFeatureState {
  value: string;
  actions: {
    setValue: (value: string) => void;
    reset: () => void;
  };
}

export const useMyFeatureStore = create<MyFeatureState>((set) => ({
  value: '',
  actions: {
    setValue: (value) => set({ value }),
    reset: () => set({ value: '' }),
  },
}));
```

### Persisted Store

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSettingsStore = create(
  persist<SettingsState>(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## UI Patterns

### Theme-Aware Colors

```typescript
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/shared/stores/theme';

function MyComponent() {
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';

  const cardBackground = isDark ? '#1c1c1e' : 'white';
  const textColor = isDark ? '#ffffff' : '#1f2937';

  return (
    <View style={{ backgroundColor: cardBackground }}>
      <Text style={{ color: textColor }}>Content</Text>
    </View>
  );
}
```

### Dark Mode Colors

| Element | Dark | Light |
|---------|------|-------|
| Page background | `#121216` | `#fafafa` |
| Card background | `#1c1c1e` | `white` |
| Subtle background | `#2c2c2e` | `#f3f4f6` |
| Primary text | `#ffffff` | `#1f2937` |
| Muted text | `#a1a1aa` | `#6b7280` |
| Border | `#2c2c2e` | `#e4e4e7` |

### Screen Layout

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import { ScreenHeader } from '@/shared/components/ui';

export default function MyScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="My Screen" />
      <ScrollView>
        <YStack padding="$4" gap="$4">
          {/* Content */}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Button Styling

```typescript
<Button
  size="$6"
  height={56}
  backgroundColor="$primary"
  borderRadius="$4"
  pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
>
  <Text color="white" fontWeight="700" fontSize="$5">
    Button Text
  </Text>
</Button>
```

---

## EAS Builds

### Configuration (eas.json)

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

### Build Commands

```bash
# Development build (with dev tools)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (TestFlight / internal)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production build (App Store / Play Store)
eas build --profile production --platform ios
eas build --profile production --platform android

# Both platforms
eas build --profile preview --platform all
```

### Build Profiles

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| development | Dev client with debugging | Internal |
| preview | TestFlight / Internal testing | Internal |
| production | Store submission | Store |

### Prerequisites

1. **EAS CLI:** `bun add -g eas-cli`
2. **Login:** `eas login`
3. **Apple Developer Account** (for iOS)
4. **Google Play Console** (for Android production)

---

## Navigation

### Tab Navigator

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Modal Navigation

```typescript
// Navigate to modal
router.push('/(modals)/settings');

// Navigate with params
router.push(`/(modals)/workout/${workoutId}`);

// Go back
router.back();
```

---

## Troubleshooting

### App Won't Start

```bash
# Clear caches
bun run start --clear

# Reinstall dependencies
rm -rf node_modules
bun install

# Reset Expo
npx expo start --clear
```

### Metro Bundler Issues

```bash
# Clear Metro cache
npx expo start --clear

# Reset watchman
watchman watch-del-all
```

### Build Failures

```bash
# Check EAS status
eas build:list

# View build logs
eas build:view
```

---

## References

- **Getting Started:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Patterns:** [architecture/PATTERNS.md](../architecture/PATTERNS.md)
- **Testing:** [TESTING.md](TESTING.md)
