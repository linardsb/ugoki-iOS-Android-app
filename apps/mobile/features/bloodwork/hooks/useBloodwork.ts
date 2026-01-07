import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type {
  BloodworkUploadResponse,
  SupportedFormatsResponse,
  ParsedBiomarker,
  BiomarkerTestGroup,
  Metric,
  UpdateBiomarkerRequest,
  AddBiomarkerRequest,
} from '../types';

// Query keys
export const bloodworkKeys = {
  all: ['bloodwork'] as const,
  biomarkers: () => [...bloodworkKeys.all, 'biomarkers'] as const,
  formats: () => [...bloodworkKeys.all, 'formats'] as const,
  history: () => [...bloodworkKeys.all, 'history'] as const,
  forDate: (date: string) => [...bloodworkKeys.all, 'date', date] as const,
  trend: (biomarker: string) => [...bloodworkKeys.all, 'trend', biomarker] as const,
};

interface UploadBloodworkParams {
  file: {
    uri: string;
    type: string;
    name: string;
  };
  testDate?: string;
}

interface UseUploadBloodworkOptions {
  onSuccess?: (data: BloodworkUploadResponse) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to upload bloodwork file (PDF or image).
 */
export function useUploadBloodwork(options?: UseUploadBloodworkOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadBloodworkParams): Promise<BloodworkUploadResponse> => {
      const formData = new FormData();

      // Append the file
      formData.append('file', {
        uri: params.file.uri,
        type: params.file.type,
        name: params.file.name,
      } as any);

      // Build URL with query params
      let url = '/uploads/bloodwork';
      const queryParams = new URLSearchParams();

      // identity_id is added by the API client interceptor
      if (params.testDate) {
        queryParams.append('test_date', params.testDate);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await apiClient.post<BloodworkUploadResponse>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate biomarker queries
      queryClient.invalidateQueries({ queryKey: bloodworkKeys.biomarkers() });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to upload bloodwork';
      options?.onError?.(message);
    },
  });
}

/**
 * Hook to get supported upload formats.
 */
export function useSupportedFormats() {
  return useQuery({
    queryKey: bloodworkKeys.formats(),
    queryFn: async (): Promise<SupportedFormatsResponse> => {
      const response = await apiClient.get<SupportedFormatsResponse>('/uploads/bloodwork/supported-formats');
      return response.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // Fresh for 24 hours (rarely changes)
  });
}

/**
 * Hook to get latest biomarkers.
 */
export function useLatestBiomarkers() {
  return useQuery({
    queryKey: bloodworkKeys.biomarkers(),
    queryFn: async (): Promise<Metric[]> => {
      try {
        const response = await apiClient.get<Metric[]>('/metrics/by-prefix', {
          params: { prefix: 'biomarker_' },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
  });
}

/**
 * Helper to categorize biomarkers for display.
 */
export function categorizeBiomarkers(biomarkers: ParsedBiomarker[]): Record<string, ParsedBiomarker[]> {
  const categories: Record<string, ParsedBiomarker[]> = {
    'Blood Count': [],
    'Lipids': [],
    'Metabolic': [],
    'Vitamins': [],
    'Iron': [],
    'Thyroid': [],
    'Kidney': [],
    'Liver': [],
    'Inflammation': [],
    'Other': [],
  };

  const categoryKeywords: Record<string, string[]> = {
    'Blood Count': ['haemoglobin', 'hemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'],
    'Lipids': ['cholesterol', 'ldl', 'hdl', 'triglyceride', 'vldl', 'lipid'],
    'Metabolic': ['glucose', 'hba1c', 'insulin', 'blood sugar'],
    'Vitamins': ['vitamin', 'b12', 'folate', 'folic'],
    'Iron': ['iron', 'ferritin', 'transferrin', 'tibc'],
    'Thyroid': ['tsh', 't3', 't4', 'thyroid'],
    'Kidney': ['creatinine', 'egfr', 'urea', 'bun', 'uric acid'],
    'Liver': ['alt', 'ast', 'alp', 'bilirubin', 'albumin', 'ggt', 'alkaline phosphatase'],
    'Inflammation': ['crp', 'esr', 'c-reactive'],
  };

  for (const biomarker of biomarkers) {
    const nameLower = biomarker.standardised_name.toLowerCase();
    let placed = false;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        categories[category].push(biomarker);
        placed = true;
        break;
      }
    }

    if (!placed) {
      categories['Other'].push(biomarker);
    }
  }

  // Remove empty categories
  for (const key of Object.keys(categories)) {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  }

  return categories;
}

/**
 * Hook to get all biomarker tests grouped by date.
 */
export function useBloodworkHistory() {
  return useQuery({
    queryKey: bloodworkKeys.history(),
    queryFn: async (): Promise<BiomarkerTestGroup[]> => {
      try {
        const response = await apiClient.get<BiomarkerTestGroup[]>('/metrics/biomarkers/grouped');
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
  });
}

/**
 * Hook to get biomarkers for a specific test date.
 */
export function useBiomarkersForDate(date: string) {
  return useQuery({
    queryKey: bloodworkKeys.forDate(date),
    queryFn: async (): Promise<Metric[]> => {
      // Use the history endpoint and filter by date
      const response = await apiClient.get<BiomarkerTestGroup[]>('/metrics/biomarkers/grouped');
      const group = response.data.find(g => g.test_date.startsWith(date));
      return group?.biomarkers || [];
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get history for a specific biomarker.
 */
export function useBiomarkerTrend(biomarkerName: string, periodDays: number = 365) {
  return useQuery({
    queryKey: bloodworkKeys.trend(biomarkerName),
    queryFn: async () => {
      const metricType = biomarkerName.startsWith('biomarker_')
        ? biomarkerName
        : `biomarker_${biomarkerName}`;

      const [historyRes, trendRes] = await Promise.all([
        apiClient.get<Metric[]>('/metrics/history', {
          params: { metric_type: metricType, limit: 100 },
        }),
        apiClient.get('/metrics/trend', {
          params: { metric_type: metricType, period_days: periodDays },
        }).catch(() => ({ data: null })),
      ]);

      return {
        history: historyRes.data,
        trend: trendRes.data,
      };
    },
    enabled: !!biomarkerName,
    staleTime: 5 * 60 * 1000,
  });
}

interface UseUpdateBiomarkerOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook to update an existing biomarker.
 */
export function useUpdateBiomarker(options?: UseUpdateBiomarkerOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ metricId, data }: { metricId: string; data: UpdateBiomarkerRequest }) => {
      const response = await apiClient.put<Metric>(`/metrics/${metricId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bloodworkKeys.all });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to update biomarker';
      options?.onError?.(message);
    },
  });
}

interface UseDeleteBiomarkerOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook to delete a biomarker.
 */
export function useDeleteBiomarker(options?: UseDeleteBiomarkerOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metricId: string) => {
      await apiClient.delete(`/metrics/${metricId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bloodworkKeys.all });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to delete biomarker';
      options?.onError?.(message);
    },
  });
}

interface UseAddBiomarkerOptions {
  onSuccess?: (data: Metric) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to add a biomarker manually.
 */
export function useAddBiomarker(options?: UseAddBiomarkerOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddBiomarkerRequest) => {
      const response = await apiClient.post<Metric>('/metrics', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bloodworkKeys.all });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to add biomarker';
      options?.onError?.(message);
    },
  });
}
