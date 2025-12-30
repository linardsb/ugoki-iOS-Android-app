import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type {
  BloodworkUploadResponse,
  SupportedFormatsResponse,
  ParsedBiomarker,
} from '../types';
import type { Metric } from '@/features/dashboard';

// Query keys
export const bloodworkKeys = {
  all: ['bloodwork'] as const,
  biomarkers: () => [...bloodworkKeys.all, 'biomarkers'] as const,
  formats: () => [...bloodworkKeys.all, 'formats'] as const,
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
