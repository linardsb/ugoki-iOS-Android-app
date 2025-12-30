import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { TimeWindow, OpenWindowRequest, FastingProtocol } from '../types';

interface StartFastParams {
  protocol?: FastingProtocol;
  customHours?: number;
}

interface UseStartFastOptions {
  onSuccess?: (data: TimeWindow) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to start a new fasting window.
 */
export function useStartFast(options?: UseStartFastOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StartFastParams = {}): Promise<TimeWindow> => {
      const { protocol = '16:8', customHours } = params;

      // Calculate scheduled end based on protocol
      const fastHours = customHours ?? getFastHours(protocol);
      const scheduledEnd = new Date();
      scheduledEnd.setHours(scheduledEnd.getHours() + fastHours);

      const request: OpenWindowRequest = {
        window_type: 'fast',
        scheduled_end: scheduledEnd.toISOString(),
        metadata: {
          protocol,
          target_hours: fastHours,
        },
      };

      const response = await apiClient.post<TimeWindow>('/time-keeper/windows', request);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate active window query
      queryClient.invalidateQueries({ queryKey: queryKeys.timeKeeper.activeWindow('fast') });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeKeeper.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}

function getFastHours(protocol: FastingProtocol): number {
  switch (protocol) {
    case '16:8':
      return 16;
    case '18:6':
      return 18;
    case '20:4':
      return 20;
    default:
      return 16;
  }
}
