/**
 * Activity Feed hooks for fetching user activity events
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { ActivityFeedItem, ActivityEvent, ActivitySummary, EventCategory, EventType } from '../types';

// ============ Query Keys ============
export const activityKeys = {
  all: ['activity'] as const,
  feed: (filters?: { category?: EventCategory; limit?: number }) =>
    [...activityKeys.all, 'feed', filters] as const,
  events: (filters?: { category?: EventCategory; event_type?: EventType }) =>
    [...activityKeys.all, 'events', filters] as const,
  summary: (startTime: string, endTime: string) =>
    [...activityKeys.all, 'summary', startTime, endTime] as const,
};

// ============ Activity Feed ============
interface UseActivityFeedOptions {
  category?: EventCategory;
  limit?: number;
  enabled?: boolean;
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { identity } = useAuthStore();
  const { category, limit = 50, enabled = true } = options;

  return useQuery({
    queryKey: activityKeys.feed({ category, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        identity_id: identity?.id || '',
        limit: String(limit),
      });

      if (category) {
        params.append('category', category);
      }

      const { data } = await apiClient.get<ActivityFeedItem[]>(`/events/feed?${params}`);
      return data;
    },
    enabled: enabled && !!identity?.id,
    staleTime: 30 * 1000, // 30 seconds - activity feed should be fresh
    refetchOnWindowFocus: true,
  });
}

// ============ Activity Events (raw) ============
interface UseActivityEventsOptions {
  category?: EventCategory;
  event_type?: EventType;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useActivityEvents(options: UseActivityEventsOptions = {}) {
  const { identity } = useAuthStore();
  const { category, event_type, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: activityKeys.events({ category, event_type }),
    queryFn: async () => {
      const params = new URLSearchParams({
        identity_id: identity?.id || '',
        limit: String(limit),
        offset: String(offset),
      });

      if (category) params.append('category', category);
      if (event_type) params.append('event_type', event_type);

      const { data } = await apiClient.get<ActivityEvent[]>(`/events?${params}`);
      return data;
    },
    enabled: enabled && !!identity?.id,
    staleTime: 30 * 1000,
  });
}

// ============ Activity Summary ============
export function useActivitySummary(startTime?: string, endTime?: string) {
  const { identity } = useAuthStore();

  // Default to last 30 days
  const defaultEnd = new Date().toISOString();
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const start = startTime || defaultStart;
  const end = endTime || defaultEnd;

  return useQuery({
    queryKey: activityKeys.summary(start, end),
    queryFn: async () => {
      const params = new URLSearchParams({
        identity_id: identity?.id || '',
        start_time: start,
        end_time: end,
      });

      const { data } = await apiClient.get<ActivitySummary>(`/events/summary?${params}`);
      return data;
    },
    enabled: !!identity?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ Recent Activity (shortcut) ============
export function useRecentActivity(limit = 10) {
  return useActivityFeed({ limit });
}

// ============ Activity by Category ============
export function useActivityByCategory(category: EventCategory, limit = 20) {
  return useActivityFeed({ category, limit });
}

// ============ Helper: Group feed items by date ============
export function groupFeedByDate(items: ActivityFeedItem[]): Map<string, ActivityFeedItem[]> {
  const grouped = new Map<string, ActivityFeedItem[]>();

  for (const item of items) {
    const date = new Date(item.timestamp);
    const dateKey = getDateLabel(date);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(item);
  }

  return grouped;
}

// ============ Helper: Get human-readable date label ============
function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (itemDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (now.getTime() - itemDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// ============ Helper: Format time ============
export function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
