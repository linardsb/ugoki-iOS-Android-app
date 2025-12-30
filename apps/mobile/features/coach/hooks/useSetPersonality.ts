import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { CoachPersonality } from '../types';

interface UseSetPersonalityOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook to set the coach personality style.
 */
export function useSetPersonality(options?: UseSetPersonalityOptions) {
  const queryClient = useQueryClient();
  const identityId = useAuthStore((state) => state.identity?.id);

  return useMutation({
    mutationFn: async (personality: CoachPersonality): Promise<void> => {
      await apiClient.put('/coach/personality', personality, {
        params: { identity_id: identityId },
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      // Invalidate context to refresh personality
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.all });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to set personality';
      options?.onError?.(message);
    },
  });
}
