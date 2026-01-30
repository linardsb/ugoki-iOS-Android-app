/**
 * Challenge Templates Hooks
 * React Query hooks for challenge template management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type {
  Challenge,
  ChallengeTemplate,
  CreateChallengeFromTemplateParams,
} from '../types';

// =========================================================================
// List Templates
// =========================================================================

/**
 * Fetch available challenge templates
 * @param activeOnly - Only return active templates (default: true)
 */
export function useChallengeTemplates(activeOnly = true) {
  return useQuery({
    queryKey: queryKeys.social.challengeTemplates(),
    queryFn: async (): Promise<ChallengeTemplate[]> => {
      const response = await apiClient.get('/social/challenges/templates', {
        params: { active_only: activeOnly },
      });
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Templates don't change often - 10 min stale
  });
}

// =========================================================================
// Create Challenge from Template
// =========================================================================

/**
 * Create a new challenge from a template
 * Automatically invites specified friends
 */
export function useCreateChallengeFromTemplate() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateChallengeFromTemplateParams): Promise<Challenge> => {
      const response = await apiClient.post('/social/challenges/from-template', params, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate challenge lists to show the new challenge
      queryClient.invalidateQueries({ queryKey: queryKeys.social.challenges() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.myChallenges() });
    },
  });
}
