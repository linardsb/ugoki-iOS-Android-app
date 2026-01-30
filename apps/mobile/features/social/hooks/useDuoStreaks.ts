/**
 * Duo Streaks Hooks
 * React Query hooks for duo streak management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type {
  DuoStreak,
  DuoStreakInvite,
  CreateDuoStreakRequest,
  RespondDuoStreakInviteRequest,
} from '../types';

// =========================================================================
// Duo Streaks List
// =========================================================================

export function useDuoStreaks() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.duoStreaks(),
    queryFn: async (): Promise<DuoStreak[]> => {
      const response = await apiClient.get('/social/duo-streaks', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

export function useDuoStreak(duoStreakId: string) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.duoStreak(duoStreakId),
    queryFn: async (): Promise<DuoStreak> => {
      const response = await apiClient.get(`/social/duo-streaks/${duoStreakId}`, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id && !!duoStreakId,
  });
}

export function useDuoStreaksAtRisk() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.duoStreaksAtRisk(),
    queryFn: async (): Promise<DuoStreak[]> => {
      const response = await apiClient.get('/social/duo-streaks/at-risk', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
    // Refetch more frequently to keep at-risk status current
    staleTime: 60 * 1000, // 1 minute
  });
}

// =========================================================================
// Duo Streak Invites
// =========================================================================

export function useDuoStreakInvites() {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.duoStreakInvites(),
    queryFn: async (): Promise<DuoStreakInvite[]> => {
      const response = await apiClient.get('/social/duo-streaks/invites', {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// Duo Streak Actions
// =========================================================================

export function useCreateDuoStreakInvite() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateDuoStreakRequest): Promise<DuoStreakInvite> => {
      const response = await apiClient.post('/social/duo-streaks', params, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.duoStreakInvites() });
    },
  });
}

export function useRespondToDuoStreakInvite() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inviteId,
      accept,
    }: {
      inviteId: string;
      accept: boolean;
    }): Promise<DuoStreak | null> => {
      const response = await apiClient.post(
        `/social/duo-streaks/invites/${inviteId}/respond`,
        { accept },
        { params: { identity_id: identity?.id } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.duoStreaks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.duoStreakInvites() });
    },
  });
}

export function useEndDuoStreak() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (duoStreakId: string): Promise<void> => {
      await apiClient.delete(`/social/duo-streaks/${duoStreakId}`, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.duoStreaks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.duoStreaksAtRisk() });
    },
  });
}

// =========================================================================
// Helper Hooks
// =========================================================================

export function useDuoStreakInviteCount() {
  const { data: invites } = useDuoStreakInvites();
  return invites?.filter((i) => i.status === 'pending').length ?? 0;
}

export function useActiveDuoStreakCount() {
  const { data: streaks } = useDuoStreaks();
  return streaks?.filter((s) => !s.ended_at).length ?? 0;
}

export function useDuoStreaksAtRiskCount() {
  const { data: streaks } = useDuoStreaksAtRisk();
  return streaks?.length ?? 0;
}
