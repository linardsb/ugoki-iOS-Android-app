// Bloodwork types - matches backend models

export type BiomarkerFlag = 'low' | 'normal' | 'high' | 'abnormal';

export interface ParsedBiomarker {
  raw_name: string;
  standardised_name: string;
  value: number;
  value_text: string;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: BiomarkerFlag | null;
}

export interface BloodworkUploadResponse {
  success: boolean;
  test_date: string | null;
  biomarker_count: number;
  biomarkers: ParsedBiomarker[];
  message: string;
}

export interface SupportedFormat {
  mime_type: string;
  extension: string;
  description: string;
}

export interface SupportedFormatsResponse {
  formats: SupportedFormat[];
  max_file_size_mb: number;
  notes: string[];
}

// Categorized biomarker summary from AI coach tools
export type BiomarkerCategory =
  | 'Blood Count'
  | 'Lipids'
  | 'Metabolic'
  | 'Vitamins'
  | 'Iron'
  | 'Thyroid'
  | 'Kidney'
  | 'Liver'
  | 'Inflammation'
  | 'Other';

export interface BiomarkerSummary {
  category: BiomarkerCategory;
  markers: Array<{
    name: string;
    value: number;
    unit: string;
    flag: BiomarkerFlag | null;
  }>;
  has_abnormal: boolean;
}

export interface BloodworkSummaryResponse {
  categories: BiomarkerSummary[];
  overall_status: 'normal' | 'needs_attention';
  last_test_date: string | null;
}
