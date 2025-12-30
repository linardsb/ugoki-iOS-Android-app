import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { Workout, WorkoutFilter } from '../types';

/**
 * Hook to fetch workouts with optional filters.
 */
export function useWorkouts(filters?: WorkoutFilter, limit = 20, offset = 0) {
  return useQuery({
    queryKey: queryKeys.content.workouts({ ...filters, limit, offset }),
    queryFn: async (): Promise<Workout[]> => {
      const response = await apiClient.get<Workout[]>('/content/workouts', {
        params: {
          ...filters,
          limit,
          offset,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch featured workouts.
 */
export function useFeaturedWorkouts(limit = 5) {
  return useWorkouts({ is_featured: true }, limit);
}
