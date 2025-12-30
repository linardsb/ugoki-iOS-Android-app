import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { TimeWindow } from '../types';

interface UseFastingHistoryOptions {
  limit?: number;
  startAfter?: string;
  endBefore?: string;
}

/**
 * Hook to get fasting history.
 */
export function useFastingHistory(options: UseFastingHistoryOptions = {}) {
  const { limit = 20, startAfter, endBefore } = options;

  return useQuery({
    queryKey: queryKeys.timeKeeper.history('fast'),
    queryFn: async (): Promise<TimeWindow[]> => {
      const response = await apiClient.get<TimeWindow[]>('/time-keeper/windows', {
        params: {
          window_type: 'fast',
          limit,
          start_time: startAfter,
          end_time: endBefore,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
  });
}
