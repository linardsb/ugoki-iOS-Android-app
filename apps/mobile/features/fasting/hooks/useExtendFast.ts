import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { TimeWindow, ExtendWindowRequest } from '../types';

interface ExtendFastParams {
  windowId: string;
  additionalHours?: number;
  newEndTime?: string;
}

interface UseExtendFastOptions {
  onSuccess?: (data: TimeWindow) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to extend an active fasting window.
 */
export function useExtendFast(options?: UseExtendFastOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ windowId, additionalHours, newEndTime }: ExtendFastParams): Promise<TimeWindow> => {
      let newEnd: string;

      if (newEndTime) {
        newEnd = newEndTime;
      } else if (additionalHours) {
        const now = new Date();
        now.setHours(now.getHours() + additionalHours);
        newEnd = now.toISOString();
      } else {
        throw new Error('Either additionalHours or newEndTime is required');
      }

      const request: ExtendWindowRequest = {
        new_end: newEnd,
      };

      const response = await apiClient.post<TimeWindow>(`/time-keeper/windows/${windowId}/extend`, request);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeKeeper.activeWindow('fast') });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
