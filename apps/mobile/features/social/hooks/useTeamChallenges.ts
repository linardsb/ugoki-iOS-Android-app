/**
 * Team Challenges Hooks (Sprint 3)
 * React Query hooks for team challenge operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api/client';
import {
  ChallengeTeam,
  ChallengeTeamLeaderboard,
  CreateTeamParams,
  JoinTeamParams,
  JoinTeamResponse,
} from '../types';
import { challengeKeys } from './useChallenges';

// =========================================================================
// Query Keys
// =========================================================================

export const teamKeys = {
  all: ['challenge-teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (challengeId: string) => [...teamKeys.lists(), challengeId] as const,
  leaderboards: () => [...teamKeys.all, 'leaderboard'] as const,
  leaderboard: (challengeId: string) => [...teamKeys.leaderboards(), challengeId] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (teamId: string) => [...teamKeys.details(), teamId] as const,
};

// =========================================================================
// Query Hooks
// =========================================================================

/**
 * Get all teams in a challenge
 */
export function useChallengeTeams(challengeId: string) {
  return useQuery({
    queryKey: teamKeys.list(challengeId),
    queryFn: async () => {
      const { data } = await api.get<ChallengeTeam[]>(
        `/social/challenges/${challengeId}/teams`
      );
      return data;
    },
    enabled: !!challengeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get team leaderboard for a challenge
 */
export function useTeamLeaderboard(challengeId: string) {
  return useQuery({
    queryKey: teamKeys.leaderboard(challengeId),
    queryFn: async () => {
      const { data } = await api.get<ChallengeTeamLeaderboard>(
        `/social/challenges/${challengeId}/teams/leaderboard`
      );
      return data;
    },
    enabled: !!challengeId,
    staleTime: 2 * 60 * 1000, // 2 minutes for fresher leaderboard data
  });
}

/**
 * Get a specific team's details
 */
export function useChallengeTeam(teamId: string, includeMembers: boolean = false) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: async () => {
      const { data } = await api.get<ChallengeTeam>(
        `/social/challenges/teams/${teamId}`,
        { params: { include_members: includeMembers } }
      );
      return data;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
}

// =========================================================================
// Mutation Hooks
// =========================================================================

/**
 * Create a new team in a team challenge
 */
export function useCreateTeam(challengeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTeamParams) => {
      const { data } = await api.post<ChallengeTeam>(
        `/social/challenges/${challengeId}/teams`,
        params
      );
      return data;
    },
    onSuccess: (newTeam) => {
      // Invalidate team list for this challenge
      queryClient.invalidateQueries({ queryKey: teamKeys.list(challengeId) });
      // Invalidate challenge to update team_count
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      // Add new team to cache
      queryClient.setQueryData(teamKeys.detail(newTeam.id), newTeam);
    },
  });
}

/**
 * Join a team using its join code
 */
export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: JoinTeamParams) => {
      const { data } = await api.post<JoinTeamResponse>(
        '/social/challenges/teams/join',
        params
      );
      return data;
    },
    onSuccess: (response) => {
      // Invalidate team list for this challenge
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(response.challenge.id),
      });
      // Invalidate challenges list
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
      // Add team to cache
      queryClient.setQueryData(teamKeys.detail(response.team.id), response.team);
    },
  });
}

/**
 * Leave a team
 */
export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete(`/social/challenges/teams/${teamId}/leave`);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Remove team from detail cache
      queryClient.removeQueries({ queryKey: teamKeys.detail(teamId) });
      // Invalidate all team lists (we don't know the challenge ID here)
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      // Invalidate challenges
      queryClient.invalidateQueries({ queryKey: challengeKeys.all });
    },
  });
}
