import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { WorkoutSession } from '../types';

/**
 * Hook to fetch workout history.
 */
export function useWorkoutHistory(limit = 20, offset = 0) {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: [...queryKeys.content.sessions(), 'history', limit, offset],
    queryFn: async (): Promise<WorkoutSession[]> => {
      const response = await apiClient.get<WorkoutSession[]>('/content/sessions/history', {
        params: {
          identity_id: identityId,
          limit,
          offset,
        },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 60 * 1000, // 1 minute
  });
}
