---
name: ugoki-mobile
description: >
  UGOKI mobile development with Expo, React Native, Tamagui, Zustand, TanStack
  Query. Load when: building screens, creating components, working with
  navigation, hooks, state, styling, dark mode, or animations. Keywords: screen,
  component, Expo, React Native, Tamagui, Zustand, TanStack Query, hook, useQuery,
  useMutation, navigation, modal, tab, dark mode, theme, TouchableOpacity.
---

# UGOKI Mobile Development

## Tech Stack

```
Expo SDK 52 | React Native 0.76 | Tamagui 1.141
Zustand 5.0 | TanStack Query 5.0 | Expo Router 4.0
AsyncStorage | react-native-reanimated 3.16 | Phosphor Icons
```

---

## Feature Module Structure

```
features/{feature}/
├── index.ts              # Re-exports
├── types.ts              # TypeScript (match backend exactly)
├── hooks/
│   ├── index.ts          # Re-exports
│   └── use{Feature}.ts   # TanStack Query hooks
├── components/
│   └── {Component}.tsx
└── stores/               # Zustand (if needed)
    └── {feature}Store.ts
```

---

## Critical Gotchas (Real Bugs)

### 1. Conditional Rendering with Numbers

```tsx
// ❌ CRASH: Returns "0" which breaks Text rendering
{count && <Text>{count} items</Text>}
{requestCount && requestCount > 0 && <Badge />}

// ✅ SAFE: Always use ternary with numbers
{count > 0 ? <Text>{count} items</Text> : null}
{requestCount > 0 ? <Badge count={requestCount} /> : null}
```

### 2. Nested Touch Handlers

```tsx
// ❌ BROKEN: stopPropagation doesn't work in React Native
<Pressable onPress={onCardPress}>
  <Pressable onPress={(e) => { e.stopPropagation(); onBookmark(); }}>
    <BookmarkIcon />
  </Pressable>
</Pressable>

// ✅ WORKS: Use TouchableOpacity + hitSlop
<TouchableOpacity onPress={onCardPress} activeOpacity={0.7}>
  <View>
    <Text>Card content</Text>
    <TouchableOpacity 
      onPress={onBookmark}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ position: 'absolute', right: 8, top: 8 }}
    >
      <BookmarkIcon />
    </TouchableOpacity>
  </View>
</TouchableOpacity>
```

### 3. Font Rendering

```tsx
// ❌ FAILS: fontWeight with Tamagui sometimes breaks
<Text fontWeight="700">Bold</Text>
<Text fontFamily="InterBold">Bold</Text>

// ✅ WORKS: Use explicit font names
<Text fontFamily="InterSemiBold">Semi-bold</Text>

// Or use native Text for reliability
import { Text } from 'react-native';
<Text style={{ fontFamily: 'InterSemiBold', fontSize: 16 }}>Works!</Text>
```

### 4. Route Parameter Handling

```tsx
// ❌ WRONG: params can be string OR array
const { id } = useLocalSearchParams();
await getItem(id); // Might pass ["id"]!

// ✅ RIGHT: Always handle array case
const params = useLocalSearchParams<{ id: string }>();
const id = Array.isArray(params.id) ? params.id[0] : params.id;
```

### 5. Safe Area for Headers

```tsx
// ❌ BROKEN: Overlaps notch/status bar
<YStack paddingVertical="$3">
  <Text>Header</Text>
</YStack>

// ✅ WORKS: Use safe area insets
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScreenHeader() {
  const insets = useSafeAreaInsets();
  return (
    <YStack paddingTop={insets.top + 8} paddingBottom="$3" paddingHorizontal="$4">
      <Text>Header</Text>
    </YStack>
  );
}
```

---

## Dark Mode Pattern (Standard)

```tsx
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/shared/stores/theme';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';

  return {
    isDark,
    colors: {
      background: isDark ? '#121216' : '#fafafa',
      card: isDark ? '#1c1c1e' : 'white',
      cardSubtle: isDark ? '#2c2c2e' : '#f3f4f6',
      text: isDark ? '#ffffff' : '#1f2937',
      textMuted: isDark ? '#a1a1aa' : '#6b7280',
      textSubtle: isDark ? '#71717a' : '#9ca3af',
      border: isDark ? '#2c2c2e' : '#e4e4e7',
      teal: '#14b8a6',
      tealBg: isDark ? '#14b8a620' : '#d1fae5',
    }
  };
}
```

### Color Palette Reference

| Element | Dark | Light |
|---------|------|-------|
| Page background | `#121216` | `#fafafa` |
| Card background | `#1c1c1e` | `white` |
| Subtle/secondary bg | `#2c2c2e` | `#f3f4f6` |
| Primary text | `#ffffff` | `#1f2937` |
| Muted text | `#a1a1aa` | `#6b7280` |
| Subtle text | `#71717a` | `#9ca3af` |
| Border | `#2c2c2e` | `#e4e4e7` |
| Teal accent | `#14b8a6` | `#14b8a6` |
| Green (success) | `#22c55e` | `#22c55e` |

**Important:** On white/light card backgrounds, hardcode text colors. Theme tokens may not resolve.

---

## TanStack Query Patterns

### Query Keys (Consistent Pattern)

```typescript
// features/{feature}/hooks/use{Feature}.ts

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: string) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};
```

### Query Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { Item } from '../types';

export function useItems(status?: string) {
  return useQuery({
    queryKey: itemKeys.list(status || 'all'),
    queryFn: async () => {
      const { data } = await api.get<Item[]>('/items', {
        params: { status }
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Item>(`/items/${id}`);
      return data;
    },
    enabled: !!id, // Don't fetch if no ID
  });
}
```

### Mutation Hook with Cache Invalidation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateItemRequest) => {
      const { data: item } = await api.post<Item>('/items', data);
      return item;
    },
    onSuccess: () => {
      // Invalidate all item lists
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create item');
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/items/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache immediately
      queryClient.removeQueries({ queryKey: itemKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}
```

---

## Zustand Store Pattern

```typescript
// features/{feature}/stores/{feature}Store.ts

import { create } from 'zustand';

interface ItemStore {
  // State
  selectedId: string | null;
  isEditing: boolean;
  
  // Actions
  setSelected: (id: string | null) => void;
  setEditing: (editing: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedId: null,
  isEditing: false,
};

export const useItemStore = create<ItemStore>((set) => ({
  ...initialState,
  
  setSelected: (id) => set({ selectedId: id }),
  setEditing: (editing) => set({ isEditing: editing }),
  reset: () => set(initialState),
}));
```

---

## Component Template

```tsx
import { YStack, XStack, Text, Card } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/shared/hooks/useAppTheme';
import { Item } from '../types';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
  onBookmark?: () => void;
}

export function ItemCard({ item, onPress, onBookmark }: ItemCardProps) {
  const { isDark, colors } = useAppTheme();
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        backgroundColor={colors.card}
        padding="$4"
        marginBottom="$3"
        borderRadius="$4"
        borderWidth={1}
        borderColor={colors.border}
      >
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text 
              fontSize="$5" 
              fontFamily="InterSemiBold"
              color={colors.text}
              numberOfLines={1}
              flex={1}
            >
              {item.name}
            </Text>
            
            {onBookmark && (
              <TouchableOpacity
                onPress={onBookmark}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <BookmarkIcon color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </XStack>
          
          <Text color={colors.textMuted} fontSize="$3">
            {item.description}
          </Text>
        </YStack>
      </Card>
    </TouchableOpacity>
  );
}
```

---

## Screen Template

```tsx
// app/(modals)/items/index.tsx

import { YStack, ScrollView, Spinner, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import { useItems } from '@/features/items/hooks';
import { ItemCard } from '@/features/items/components';
import { ScreenHeader } from '@/shared/components/ui';
import { useAppTheme } from '@/shared/hooks/useAppTheme';

export default function ItemsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { data: items, isLoading, error, refetch, isRefetching } = useItems();

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={colors.background}>
        <Spinner size="large" color={colors.teal} />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} backgroundColor={colors.background}>
        <ScreenHeader title="Items" />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color="$red10" textAlign="center">
            Failed to load items. Pull to refresh.
          </Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={colors.background}>
      <ScreenHeader title="Items" />
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack padding="$4" gap="$3">
          {items && items.length > 0 ? (
            items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/items/${item.id}`)}
              />
            ))
          ) : (
            <YStack padding="$8" alignItems="center">
              <Text color={colors.textMuted}>No items yet</Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
```

---

## Navigation Structure

```
app/
├── _layout.tsx               # Root with providers
├── (auth)/
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   └── onboarding.tsx
├── (tabs)/
│   ├── _layout.tsx           # Tab bar configuration
│   ├── index.tsx             # Dashboard
│   ├── fasting.tsx
│   ├── workouts.tsx
│   └── profile.tsx
└── (modals)/
    ├── _layout.tsx           # Stack with modal presentation
    ├── settings.tsx
    ├── items/
    │   ├── index.tsx
    │   └── [id].tsx          # Dynamic route
    └── ...
```

---

## Debugging Guide

### App Crashes on Load

1. Check Metro bundler for red error
2. Look for: import errors, syntax errors, missing dependencies
3. Try: `bun run start --clear` to clear cache

### Component Not Rendering

1. Check data: `console.log(data)` in hook
2. Check loading state: showing spinner forever?
3. Check error state: silently failing?

### Styles Not Applied

1. Tamagui token issue: try hardcoded values
2. Dark mode: check theme detection
3. On cards: hardcode colors for text

### Touch Not Working

1. Element covered by another view?
2. hitSlop too small?
3. Nested Pressable issue → use TouchableOpacity

### Types Don't Match Backend

1. Backend changed? Update `types.ts`
2. Check: optional vs required fields
3. Check: date format (string vs Date)

---

## Base UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppButton` | `shared/components/ui/` | Primary button |
| `AppSwitch` | `shared/components/ui/` | Toggle (50×28px, green) |
| `Card` | `shared/components/ui/` | Card container |
| `ScreenHeader` | `shared/components/ui/` | Header with safe area |
| `ProgressRing` | `shared/components/ui/` | Circular progress |
| `StatCard` | `shared/components/ui/` | Stats with trends |
| `EmptyState` | `shared/components/ui/` | Empty + action button |
| `Avatar` | `shared/components/ui/` | User avatar + fallback |

---

## References

- `references/tamagui-tokens.md` - All spacing, color, typography tokens
- `references/navigation.md` - Deep linking, auth guards, modals
- `references/animations.md` - Reanimated patterns
