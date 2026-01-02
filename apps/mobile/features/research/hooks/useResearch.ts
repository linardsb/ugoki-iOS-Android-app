/**
 * React Query hooks for RESEARCH feature.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type {
  ResearchTopic,
  ResearchPaper,
  SearchResponse,
  TopicResponse,
  UserSearchQuota,
  SavedResearch,
  TopicInfo,
} from '../types';

// =============================================================================
// Query Keys
// =============================================================================

export const researchKeys = {
  all: ['research'] as const,
  search: (query?: string, topic?: ResearchTopic) =>
    [...researchKeys.all, 'search', query, topic] as const,
  topics: () => [...researchKeys.all, 'topics'] as const,
  topic: (topic: ResearchTopic) => [...researchKeys.all, 'topic', topic] as const,
  paper: (id: string) => [...researchKeys.all, 'paper', id] as const,
  saved: () => [...researchKeys.all, 'saved'] as const,
  quota: () => [...researchKeys.all, 'quota'] as const,
};

// =============================================================================
// Search
// =============================================================================

export function useResearchSearch(query?: string, topic?: ResearchTopic) {
  return useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (topic) params.set('topic', topic);
      params.set('limit', '10');

      const response = await apiClient.get<SearchResponse>(
        `/research/search?${params.toString()}`
      );
      return response.data;
    },
  });
}

// =============================================================================
// Topics
// =============================================================================

export function useTopics() {
  return useQuery({
    queryKey: researchKeys.topics(),
    queryFn: async () => {
      const response = await apiClient.get<TopicInfo[]>('/research/topics');
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useTopicPapers(topic: ResearchTopic, enabled = true) {
  return useQuery({
    queryKey: researchKeys.topic(topic),
    queryFn: async () => {
      const response = await apiClient.get<TopicResponse>(
        `/research/topics/${topic}?limit=10`
      );
      return response.data;
    },
    enabled,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

// =============================================================================
// Single Paper
// =============================================================================

export function usePaper(paperId: string, enabled = true) {
  return useQuery({
    queryKey: researchKeys.paper(paperId),
    queryFn: async () => {
      const response = await apiClient.get<ResearchPaper>(
        `/research/papers/${paperId}`
      );
      return response.data;
    },
    enabled: enabled && !!paperId,
  });
}

// =============================================================================
// Saved Research
// =============================================================================

export function useSavedResearch() {
  return useQuery({
    queryKey: researchKeys.saved(),
    queryFn: async () => {
      const response = await apiClient.get<SavedResearch[]>('/research/saved');
      return response.data;
    },
  });
}

export function useSaveResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ researchId, notes }: { researchId: string; notes?: string }) => {
      const response = await apiClient.post<SavedResearch>('/research/saved', {
        research_id: researchId,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.saved() });
    },
  });
}

export function useUnsaveResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (savedId: string) => {
      await apiClient.delete(`/research/saved/${savedId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.saved() });
    },
  });
}

// =============================================================================
// Quota
// =============================================================================

export function useSearchQuota() {
  return useQuery({
    queryKey: researchKeys.quota(),
    queryFn: async () => {
      const response = await apiClient.get<UserSearchQuota>('/research/quota');
      return response.data;
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });
}
