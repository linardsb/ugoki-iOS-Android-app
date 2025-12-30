import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { WorkoutSession, CompleteWorkoutRequest } from '../types';

interface UseCompleteWorkoutOptions {
  onSuccess?: (session: WorkoutSession) => void;
  onError?: (error: string) => void;
}

interface CompleteWorkoutParams {
  sessionId: string;
  caloriesBurned?: number;
}

/**
 * Hook to complete a workout session.
 */
export function useCompleteWorkout(options?: UseCompleteWorkoutOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, caloriesBurned }: CompleteWorkoutParams): Promise<WorkoutSession> => {
      const request: CompleteWorkoutRequest | undefined = caloriesBurned
        ? { calories_burned: caloriesBurned }
        : undefined;

      const response = await apiClient.post<WorkoutSession>(
        `/content/sessions/${sessionId}/complete`,
        request
      );
      return response.data;
    },
    onSuccess: (session) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.content.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.progression.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      options?.onSuccess?.(session);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to complete workout';
      options?.onError?.(message);
    },
  });
}
