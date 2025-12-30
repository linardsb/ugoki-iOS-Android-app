import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { WorkoutSession, StartWorkoutRequest } from '../types';

interface UseStartWorkoutOptions {
  onSuccess?: (session: WorkoutSession) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to start a workout session.
 */
export function useStartWorkout(options?: UseStartWorkoutOptions) {
  const queryClient = useQueryClient();
  const identityId = useAuthStore((state) => state.identity?.id);

  return useMutation({
    mutationFn: async (workoutId: string): Promise<WorkoutSession> => {
      const request: StartWorkoutRequest = { workout_id: workoutId };
      const response = await apiClient.post<WorkoutSession>('/content/sessions', request, {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    onSuccess: (session) => {
      // Invalidate active session and sessions list
      queryClient.invalidateQueries({ queryKey: queryKeys.content.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.stats() });
      options?.onSuccess?.(session);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to start workout';
      options?.onError?.(message);
    },
  });
}
