import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { TimeWindow } from '../types';

/**
 * Hook to get the currently active fasting window.
 * Returns null if no fast is active.
 */
export function useActiveFast() {
  return useQuery({
    queryKey: queryKeys.timeKeeper.activeWindow('fast'),
    queryFn: async (): Promise<TimeWindow | null> => {
      try {
        const response = await apiClient.get<TimeWindow>('/time-keeper/windows/active', {
          params: { window_type: 'fast' },
        });
        return response.data;
      } catch (error: any) {
        // 404 means no active fast - this is normal
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 10 * 1000, // Consider fresh for 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds when active
  });
}
