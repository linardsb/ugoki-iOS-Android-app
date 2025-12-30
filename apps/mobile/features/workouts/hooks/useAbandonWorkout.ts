import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { WorkoutSession } from '../types';

interface UseAbandonWorkoutOptions {
  onSuccess?: (session: WorkoutSession) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to abandon a workout session.
 */
export function useAbandonWorkout(options?: UseAbandonWorkoutOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<WorkoutSession> => {
      const response = await apiClient.post<WorkoutSession>(
        `/content/sessions/${sessionId}/abandon`
      );
      return response.data;
    },
    onSuccess: (session) => {
      // Invalidate session queries
      queryClient.invalidateQueries({ queryKey: queryKeys.content.sessions() });
      options?.onSuccess?.(session);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to abandon workout';
      options?.onError?.(message);
    },
  });
}
