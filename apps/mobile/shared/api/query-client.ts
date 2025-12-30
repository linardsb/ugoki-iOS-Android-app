import { QueryClient } from '@tanstack/react-query';

// Create a query client with sensible defaults for mobile
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,

      // Cache time - how long inactive data stays in cache (30 minutes)
      gcTime: 30 * 60 * 1000,

      // Retry failed queries 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on window focus for mobile (it's always in focus)
      refetchOnWindowFocus: false,

      // Refetch on reconnect (important for mobile networks)
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys factory for type-safe query keys
export const queryKeys = {
  // Identity
  identity: {
    all: ['identity'] as const,
    current: () => [...queryKeys.identity.all, 'current'] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    detail: () => [...queryKeys.profile.all, 'detail'] as const,
    onboarding: () => [...queryKeys.profile.all, 'onboarding'] as const,
    preferences: () => [...queryKeys.profile.all, 'preferences'] as const,
  },

  // Time Keeper (Fasting)
  timeKeeper: {
    all: ['timeKeeper'] as const,
    activeWindow: (type?: string) => [...queryKeys.timeKeeper.all, 'active', type] as const,
    windows: (filters?: object) => [...queryKeys.timeKeeper.all, 'list', filters] as const,
    history: (period?: string) => [...queryKeys.timeKeeper.all, 'history', period] as const,
  },

  // Metrics
  metrics: {
    all: ['metrics'] as const,
    latest: (type: string) => [...queryKeys.metrics.all, 'latest', type] as const,
    history: (type: string, period?: string) => [...queryKeys.metrics.all, 'history', type, period] as const,
    trend: (type: string) => [...queryKeys.metrics.all, 'trend', type] as const,
    biomarkers: () => [...queryKeys.metrics.all, 'biomarkers'] as const,
  },

  // Progression
  progression: {
    all: ['progression'] as const,
    level: () => [...queryKeys.progression.all, 'level'] as const,
    streaks: () => [...queryKeys.progression.all, 'streaks'] as const,
    achievements: () => [...queryKeys.progression.all, 'achievements'] as const,
  },

  // Content (Workouts)
  content: {
    all: ['content'] as const,
    workouts: (filters?: object) => [...queryKeys.content.all, 'workouts', filters] as const,
    workout: (id: string) => [...queryKeys.content.all, 'workout', id] as const,
    categories: () => [...queryKeys.content.all, 'categories'] as const,
    recommendations: () => [...queryKeys.content.all, 'recommendations'] as const,
    sessions: () => [...queryKeys.content.all, 'sessions'] as const,
    stats: () => [...queryKeys.content.all, 'stats'] as const,
  },

  // AI Coach
  coach: {
    all: ['coach'] as const,
    messages: () => [...queryKeys.coach.all, 'messages'] as const,
    insights: () => [...queryKeys.coach.all, 'insights'] as const,
  },

  // Dashboard (aggregated)
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
  },
} as const;
