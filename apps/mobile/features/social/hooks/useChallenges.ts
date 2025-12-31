/**
 * Challenges Hooks
 * React Query hooks for challenge management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { Challenge, ChallengeParticipant, CreateChallengeParams } from '../types';

// =========================================================================
// List Challenges
// =========================================================================

export function useChallenges(includePublic = true, activeOnly = true) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.challenges({ includePublic, activeOnly }),
    queryFn: async (): Promise<Challenge[]> => {
      const response = await apiClient.get('/social/challenges', {
        params: {
          identity_id: identity?.id,
          include_public: includePublic,
          active_only: activeOnly,
        },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

export function useMyChallenges(activeOnly = true) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.myChallenges(),
    queryFn: async (): Promise<Challenge[]> => {
      const response = await apiClient.get('/social/challenges/mine', {
        params: { identity_id: identity?.id, active_only: activeOnly },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// Get Challenge
// =========================================================================

export function useChallenge(challengeId: string) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.challenge(challengeId),
    queryFn: async (): Promise<Challenge> => {
      const response = await apiClient.get(`/social/challenges/${challengeId}`, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id && !!challengeId,
  });
}

export function useChallengeLeaderboard(challengeId: string) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.challengeLeaderboard(challengeId),
    queryFn: async (): Promise<ChallengeParticipant[]> => {
      const response = await apiClient.get(`/social/challenges/${challengeId}/leaderboard`, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id && !!challengeId,
  });
}

// =========================================================================
// Challenge Actions
// =========================================================================

export function useCreateChallenge() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateChallengeParams): Promise<Challenge> => {
      const response = await apiClient.post('/social/challenges', params, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challenges() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.myChallenges() });
    },
  });
}

export function useJoinChallenge() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string): Promise<ChallengeParticipant> => {
      const response = await apiClient.post(`/social/challenges/${challengeId}/join`, null, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: (_, challengeId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challenge(challengeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.myChallenges() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challengeLeaderboard(challengeId) });
    },
  });
}

export function useJoinChallengeByCode() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<ChallengeParticipant> => {
      const response = await apiClient.post(`/social/challenges/join/${code}`, null, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challenges() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.myChallenges() });
    },
  });
}

export function useLeaveChallenge() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string): Promise<void> => {
      await apiClient.delete(`/social/challenges/${challengeId}/leave`, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: (_, challengeId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challenge(challengeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.myChallenges() });
    },
  });
}

export function useUpdateChallengeProgress() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.post('/social/challenges/update-progress', null, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.myChallenges() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challenges() });
    },
  });
}
