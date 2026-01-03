/**
 * TypeScript types for RESEARCH feature.
 * Matches backend Pydantic models.
 */

// =============================================================================
// Enums
// =============================================================================

export type ResearchTopic = 'intermittent_fasting' | 'hiit' | 'nutrition' | 'sleep';

export type ResearchSource = 'pubmed' | 'openalex' | 'europepmc';

// =============================================================================
// AI-Generated Content
// =============================================================================

export interface KeyBenefit {
  emoji: string;
  title: string;
  description: string;
}

export interface ResearchDigest {
  one_liner: string;
  key_benefits: KeyBenefit[];
  audience_tags: string[];
  tldr: string;
  /** @deprecated Use audience_tags instead */
  who_benefits?: string;
}

// =============================================================================
// Research Paper
// =============================================================================

export interface ResearchPaper {
  id: string;
  pmid: string | null;
  doi: string | null;
  title: string;
  authors: string[];
  journal: string | null;
  publication_date: string | null; // ISO date string
  topic: ResearchTopic;
  digest: ResearchDigest | null;
  abstract: string | null;
  external_url: string;
  open_access: boolean;
  source: ResearchSource;
  created_at: string;
  updated_at: string;
}

export interface ResearchPaperSummary {
  id: string;
  title: string;
  one_liner: string | null;
  topic: ResearchTopic;
  publication_date: string | null;
  key_benefits_count: number;
  external_url: string;
  is_saved: boolean;
}

// =============================================================================
// Request/Response Types
// =============================================================================

export interface SearchRequest {
  query?: string;
  topic?: ResearchTopic;
  limit?: number;
}

export interface SearchResponse {
  results: ResearchPaper[];
  total_count: number;
  searches_remaining: number;
  cached: boolean;
}

export interface TopicResponse {
  topic: ResearchTopic;
  topic_label: string;
  topic_description: string;
  papers: ResearchPaper[];
  total_count: number;
}

// =============================================================================
// Quota
// =============================================================================

export interface UserSearchQuota {
  identity_id: string;
  searches_today: number;
  limit: number;
  searches_remaining: number;
  resets_at: string;
}

// =============================================================================
// Saved Research
// =============================================================================

export interface SaveResearchRequest {
  research_id: string;
  notes?: string;
}

export interface SavedResearch {
  id: string;
  identity_id: string;
  research_id: string;
  paper: ResearchPaper | null;
  notes: string | null;
  saved_at: string;
}

// =============================================================================
// Topic Metadata
// =============================================================================

export interface TopicInfo {
  id: ResearchTopic;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const TOPIC_METADATA: Record<ResearchTopic, TopicInfo> = {
  intermittent_fasting: {
    id: 'intermittent_fasting',
    label: 'Intermittent Fasting',
    description: 'Research on time-restricted eating and metabolic benefits',
    icon: 'fork-knife',
    color: '#14b8a6',
  },
  hiit: {
    id: 'hiit',
    label: 'HIIT Training',
    description: 'High-intensity interval training and workout optimization',
    icon: 'lightning',
    color: '#f97316',
  },
  nutrition: {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Diet, macronutrients, and their effects on health',
    icon: 'carrot',
    color: '#22c55e',
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep',
    description: 'Sleep quality, recovery, and circadian rhythm',
    icon: 'moon',
    color: '#8b5cf6',
  },
};

// Helper functions
export function getTopicLabel(topic: ResearchTopic): string {
  return TOPIC_METADATA[topic]?.label || topic;
}

export function getTopicColor(topic: ResearchTopic): string {
  return TOPIC_METADATA[topic]?.color || '#6b7280';
}

export function getTopicIcon(topic: ResearchTopic): string {
  return TOPIC_METADATA[topic]?.icon || 'book';
}
