import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { Metric, MetricTrend, MetricSummary } from '../types';

interface LogWeightParams {
  value: number;
  note?: string;
  timestamp?: string;
}

interface UseLogWeightOptions {
  onSuccess?: (metric: Metric) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to log a new weight entry.
 */
export function useLogWeight(options?: UseLogWeightOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogWeightParams): Promise<Metric> => {
      const response = await apiClient.post<Metric>('/metrics', {
        metric_type: 'weight_kg',
        value: params.value,
        note: params.note,
        timestamp: params.timestamp || new Date().toISOString(),
        source: 'user_input',
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate weight-related queries
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to log weight';
      options?.onError?.(message);
    },
  });
}

/**
 * Hook to get the latest weight metric.
 */
export function useLatestWeight() {
  return useQuery({
    queryKey: queryKeys.metrics.latest('weight_kg'),
    queryFn: async (): Promise<Metric | null> => {
      try {
        const response = await apiClient.get<Metric>('/metrics/latest', {
          params: { metric_type: 'weight_kg' },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
  });
}

/**
 * Hook to get weight trend.
 */
export function useWeightTrend(periodDays: number = 7) {
  return useQuery({
    queryKey: queryKeys.metrics.trend('weight_kg'),
    queryFn: async (): Promise<MetricTrend | null> => {
      try {
        const response = await apiClient.get<MetricTrend>('/metrics/trend', {
          params: { metric_type: 'weight_kg', period_days: periodDays },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get weight history for charts.
 */
export function useWeightHistory(limit: number = 30) {
  return useQuery({
    queryKey: queryKeys.metrics.history('weight_kg', `${limit}`),
    queryFn: async (): Promise<Metric[]> => {
      const response = await apiClient.get<Metric[]>('/metrics/history', {
        params: { metric_type: 'weight_kg', limit },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get weight summary stats.
 */
export function useWeightSummary() {
  return useQuery({
    queryKey: ['metrics', 'summary', 'weight_kg'],
    queryFn: async (): Promise<MetricSummary | null> => {
      try {
        const response = await apiClient.get<MetricSummary>('/metrics/summary', {
          params: { metric_type: 'weight_kg' },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
