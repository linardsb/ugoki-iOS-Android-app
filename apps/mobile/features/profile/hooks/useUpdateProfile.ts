import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { UserProfile, UpdateProfileRequest } from '../types';

interface UseUpdateProfileOptions {
  onSuccess?: (profile: UserProfile) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to update the user's profile.
 */
export function useUpdateProfile(options?: UseUpdateProfileOptions) {
  const queryClient = useQueryClient();
  const identityId = useAuthStore((state) => state.identity?.id);

  return useMutation({
    mutationFn: async (request: UpdateProfileRequest): Promise<UserProfile> => {
      const response = await apiClient.patch<UserProfile>('/profile', request, {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to update profile';
      options?.onError?.(message);
    },
  });
}
