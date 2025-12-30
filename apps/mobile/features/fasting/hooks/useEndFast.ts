import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { TimeWindow, CloseWindowRequest } from '../types';

interface EndFastParams {
  windowId: string;
  abandoned?: boolean;
  reason?: string;
}

interface UseEndFastOptions {
  onSuccess?: (data: TimeWindow) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to end/close an active fasting window.
 */
export function useEndFast(options?: UseEndFastOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ windowId, abandoned = false, reason }: EndFastParams): Promise<TimeWindow> => {
      const request: CloseWindowRequest = {
        end_state: abandoned ? 'abandoned' : 'completed',
        metadata: reason ? { reason } : undefined,
      };

      const response = await apiClient.post<TimeWindow>(`/time-keeper/windows/${windowId}/close`, request);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate all time keeper queries
      queryClient.invalidateQueries({ queryKey: queryKeys.timeKeeper.all });
      // Also invalidate progression (streaks may update)
      queryClient.invalidateQueries({ queryKey: queryKeys.progression.streaks() });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
