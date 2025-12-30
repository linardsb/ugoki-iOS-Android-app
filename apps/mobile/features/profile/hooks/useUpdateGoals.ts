import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { UserGoals, UpdateGoalsRequest } from '../types';

interface UseUpdateGoalsOptions {
  onSuccess?: (data: UserGoals) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to update user goals.
 * Automatically marks 'goals_set' in onboarding status.
 */
export function useUpdateGoals(options?: UseUpdateGoalsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateGoalsRequest): Promise<UserGoals> => {
      const response = await apiClient.patch<UserGoals>('/profile/goals', request);
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
