import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { ChatRequest, ChatResponseFull, CoachPersonality } from '../types';

interface UseSendMessageOptions {
  onSuccess?: (response: ChatResponseFull) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to send a message to the AI coach.
 */
export function useSendMessage(options?: UseSendMessageOptions) {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useMutation({
    mutationFn: async ({
      message,
      personality,
    }: {
      message: string;
      personality?: CoachPersonality;
    }): Promise<ChatResponseFull> => {
      const request: ChatRequest = { message, personality };
      const response = await apiClient.post<ChatResponseFull>('/coach/chat', request, {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to send message';
      options?.onError?.(message);
    },
  });
}
