import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { WorkoutCategory } from '../types';

/**
 * Hook to fetch all workout categories.
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.content.categories(),
    queryFn: async (): Promise<WorkoutCategory[]> => {
      const response = await apiClient.get<WorkoutCategory[]>('/content/categories');
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
  });
}
