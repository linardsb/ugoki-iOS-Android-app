/**
 * Activity Feed Hooks
 * React Query hooks for social activity feed
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { FeedItem, FeedPreferences, UpdateFeedPreferencesParams } from '../types';

// =========================================================================
// Friends Feed (with infinite scroll)
// =========================================================================

export function useFriendsFeed(limit = 20) {
  const { identity } = useAuthStore();

  return useInfiniteQuery({
    queryKey: queryKeys.social.feed(),
    queryFn: async ({ pageParam }): Promise<FeedItem[]> => {
      const params: Record<string, any> = {
        identity_id: identity?.id,
        limit,
      };
      if (pageParam) {
        params.before = pageParam;
      }
      const response = await apiClient.get('/social/feed', { params });
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limit) return undefined;
      const lastItem = lastPage[lastPage.length - 1];
      return lastItem?.created_at;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// My Activity
// =========================================================================

export function useMyActivity(limit = 20) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.myActivity(),
    queryFn: async (): Promise<FeedItem[]> => {
      const response = await apiClient.get('/social/feed/my-activity', {
        params: {
          identity_id: identity?.id,
          limit,
        },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// Feed Preferences
// =========================================================================

export function useFeedPreferences() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.feedPreferences(),
    queryFn: async (): Promise<FeedPreferences> => {
      const response = await apiClient.get('/social/feed/preferences', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

export function useUpdateFeedPreferences() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateFeedPreferencesParams): Promise<FeedPreferences> => {
      const response = await apiClient.patch('/social/feed/preferences', params, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.social.feedPreferences(), data);
    },
  });
}

// =========================================================================
// Cheer Actions
// =========================================================================

export function useCheerFeedItem() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedItemId: string): Promise<FeedItem> => {
      const response = await apiClient.post(`/social/feed/${feedItemId}/cheer`, null, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onMutate: async (feedItemId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.social.feed() });

      // Snapshot the previous value
      const previousFeed = queryClient.getQueryData(queryKeys.social.feed());

      // Optimistically update the feed
      queryClient.setQueryData(queryKeys.social.feed(), (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: FeedItem[]) =>
            page.map((item) =>
              item.id === feedItemId
                ? { ...item, i_cheered: true, cheer_count: item.cheer_count + 1 }
                : item
            )
          ),
        };
      });

      return { previousFeed };
    },
    onError: (_err, _feedItemId, context) => {
      // Rollback on error
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.social.feed(), context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
    },
  });
}

export function useUncheerFeedItem() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedItemId: string): Promise<void> => {
      await apiClient.delete(`/social/feed/${feedItemId}/cheer`, {
        params: { identity_id: identity?.id },
      });
    },
    onMutate: async (feedItemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.social.feed() });

      const previousFeed = queryClient.getQueryData(queryKeys.social.feed());

      // Optimistically update
      queryClient.setQueryData(queryKeys.social.feed(), (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: FeedItem[]) =>
            page.map((item) =>
              item.id === feedItemId
                ? { ...item, i_cheered: false, cheer_count: Math.max(0, item.cheer_count - 1) }
                : item
            )
          ),
        };
      });

      return { previousFeed };
    },
    onError: (_err, _feedItemId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.social.feed(), context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
    },
  });
}

/**
 * Convenience hook for toggling cheer state
 */
export function useToggleCheer() {
  const cheerMutation = useCheerFeedItem();
  const uncheerMutation = useUncheerFeedItem();

  return {
    toggleCheer: (feedItemId: string, isCurrentlyCheered: boolean) => {
      if (isCurrentlyCheered) {
        return uncheerMutation.mutate(feedItemId);
      } else {
        return cheerMutation.mutate(feedItemId);
      }
    },
    isPending: cheerMutation.isPending || uncheerMutation.isPending,
  };
}
