import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { WorkoutStats } from '../types';

/**
 * Hook to get workout statistics.
 */
export function useWorkoutStats() {
  return useQuery({
    queryKey: queryKeys.content.stats(),
    queryFn: async (): Promise<WorkoutStats> => {
      const response = await apiClient.get<WorkoutStats>('/content/stats');
      return response.data;
    },
    staleTime: 60 * 1000, // Fresh for 1 minute
  });
}
