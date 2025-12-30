import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { WorkoutRecommendation } from '../types';

/**
 * Hook to fetch personalized workout recommendations.
 */
export function useRecommendations(limit = 5) {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: queryKeys.content.recommendations(),
    queryFn: async (): Promise<WorkoutRecommendation[]> => {
      const response = await apiClient.get<WorkoutRecommendation[]>('/content/recommendations', {
        params: {
          identity_id: identityId,
          limit,
        },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
