import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { UserProfile, CreateProfileRequest } from '../types';

interface UseCreateProfileOptions {
  onSuccess?: (data: UserProfile) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to create a user profile.
 * Called after anonymous identity creation.
 */
export function useCreateProfile(options?: UseCreateProfileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateProfileRequest): Promise<UserProfile> => {
      const response = await apiClient.post<UserProfile>('/profile', request);
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
