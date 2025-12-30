import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { WorkoutRestrictions, UpdateWorkoutRestrictionsRequest } from '../types';

interface UseUpdateWorkoutRestrictionsOptions {
  onSuccess?: (data: WorkoutRestrictions) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to update workout restrictions including fitness level.
 * Automatically marks 'workout_restrictions_set' in onboarding status.
 */
export function useUpdateWorkoutRestrictions(options?: UseUpdateWorkoutRestrictionsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateWorkoutRestrictionsRequest): Promise<WorkoutRestrictions> => {
      const response = await apiClient.patch<WorkoutRestrictions>('/profile/workout-restrictions', request);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
