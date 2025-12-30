import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { Workout } from '../types';

interface UseWorkoutOptions {
  includeExercises?: boolean;
}

/**
 * Hook to fetch a single workout by ID.
 */
export function useWorkout(workoutId: string, options: UseWorkoutOptions = {}) {
  const { includeExercises = true } = options;

  return useQuery({
    // Include includeExercises in the query key to differentiate cached responses
    queryKey: [...queryKeys.content.workout(workoutId), { includeExercises }],
    queryFn: async (): Promise<Workout> => {
      const response = await apiClient.get<Workout>(`/content/workouts/${workoutId}`, {
        params: { include_exercises: includeExercises },
      });
      return response.data;
    },
    enabled: !!workoutId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
