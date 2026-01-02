/**
 * Research Hub - Main screen for browsing health research.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { MagnifyingGlass, BookmarkSimple } from 'phosphor-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useTopics,
  useTopicPapers,
  useResearchSearch,
  useSavedResearch,
  useSaveResearch,
  useUnsaveResearch,
  useSearchQuota,
} from '@/features/research/hooks';
import {
  TopicPill,
  ResearchCard,
  QuotaIndicator,
} from '@/features/research/components';
import type { ResearchTopic, ResearchPaper } from '@/features/research/types';

export default function ResearchHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTopic, setSelectedTopic] = useState<ResearchTopic | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Queries
  const { data: topics } = useTopics();
  const { data: quota, isLoading: quotaLoading, refetch: refetchQuota } = useSearchQuota();
  const { data: savedPapers, refetch: refetchSaved } = useSavedResearch();

  // Topic papers (when not searching)
  const topicToFetch = selectedTopic === 'all' ? 'intermittent_fasting' : selectedTopic;
  const {
    data: topicData,
    isLoading: topicLoading,
    refetch: refetchTopic,
  } = useTopicPapers(topicToFetch as ResearchTopic, !isSearching);

  // Search mutation
  const searchMutation = useResearchSearch(searchQuery, selectedTopic === 'all' ? undefined : selectedTopic);

  // Save/unsave mutations
  const saveMutation = useSaveResearch();
  const unsaveMutation = useUnsaveResearch();

  // Compute saved IDs for quick lookup
  const savedIds = useMemo(() => {
    return new Set(savedPapers?.map((s) => s.research_id) || []);
  }, [savedPapers]);

  // Papers to display
  const papers = useMemo(() => {
    if (isSearching && searchMutation.data) {
      return searchMutation.data.results;
    }
    return topicData?.papers || [];
  }, [isSearching, searchMutation.data, topicData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (quota && quota.searches_remaining <= 0) {
      return; // No quota left
    }
    setIsSearching(true);
    await searchMutation.mutateAsync();
    refetchQuota();
  };

  const handleTopicChange = (topic: ResearchTopic | 'all') => {
    setSelectedTopic(topic);
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTopic(), refetchQuota(), refetchSaved()]);
  };

  const handleSave = (paper: ResearchPaper) => {
    saveMutation.mutate({ researchId: paper.id });
  };

  const handleUnsave = (paper: ResearchPaper) => {
    const saved = savedPapers?.find((s) => s.research_id === paper.id);
    if (saved) {
      unsaveMutation.mutate(saved.id);
    }
  };

  const isLoading = topicLoading || searchMutation.isPending;
  const noQuota = quota && quota.searches_remaining <= 0;

  // Theme colors - use useColorScheme for reliable dark mode detection
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#09090b' : '#fafafa';
  const cardBackground = isDark ? '#1c1c1e' : 'white';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const mutedColor = isDark ? '#f5f5f5' : '#6b7280';  // Brightened for dark mode
  const borderColor = isDark ? '#2c2c2e' : '#e5e7eb';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader
        title="Research Hub"
        showClose
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/(modals)/research/saved')}
            style={[styles.savedButton, { backgroundColor: cardBackground }]}
          >
            <BookmarkSimple size={18} color="#f97316" weight="fill" />
            <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
              Saved
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
      >
        {/* Quota Indicator */}
        <XStack justifyContent="flex-end" marginBottom="$2">
          <QuotaIndicator quota={quota} isLoading={quotaLoading} />
        </XStack>

        {/* Search Bar */}
        <XStack
          backgroundColor={cardBackground}
          borderRadius="$4"
          paddingHorizontal="$3"
          paddingVertical="$2"
          alignItems="center"
          gap="$2"
          marginBottom="$3"
          borderWidth={1}
          borderColor={borderColor}
        >
          <MagnifyingGlass size={20} color={mutedColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search research..."
            placeholderTextColor={mutedColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            editable={!noQuota}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleSearch}
              disabled={noQuota || searchMutation.isPending}
            >
              <Text
                fontSize={14}
                fontWeight="600"
                color={noQuota ? '#9ca3af' : '#14b8a6'}
              >
                Search
              </Text>
            </TouchableOpacity>
          )}
        </XStack>

        {noQuota && (
          <YStack
            backgroundColor="#fef2f2"
            borderRadius="$3"
            padding="$3"
            marginBottom="$3"
          >
            <Text fontSize={13} color="#dc2626" textAlign="center">
              You've reached your daily search limit. Browse topics or check back tomorrow!
            </Text>
          </YStack>
        )}

        {/* Topic Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topicScroll}
          contentContainerStyle={styles.topicContainer}
        >
          <TopicPill
            topic="all"
            isSelected={selectedTopic === 'all'}
            onPress={() => handleTopicChange('all')}
          />
          {(['intermittent_fasting', 'hiit', 'nutrition', 'sleep'] as ResearchTopic[]).map(
            (topic) => (
              <TopicPill
                key={topic}
                topic={topic}
                isSelected={selectedTopic === topic}
                onPress={() => handleTopicChange(topic)}
              />
            )
          )}
        </ScrollView>

        {/* Section Title */}
        <YStack marginTop="$4" marginBottom="$3">
          <Text fontSize={18} fontWeight="700" style={{ color: textColor }}>
            {isSearching
              ? `Results for "${searchQuery}"`
              : selectedTopic === 'all'
              ? 'Featured Research'
              : topicData?.topic_label || 'Research'}
          </Text>
          {!isSearching && topicData?.topic_description && (
            <Text fontSize={13} marginTop="$1" style={{ color: mutedColor }}>
              {topicData.topic_description}
            </Text>
          )}
        </YStack>

        {/* Loading State */}
        {isLoading && (
          <YStack alignItems="center" paddingVertical="$6">
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text fontSize={14} marginTop="$2" style={{ color: mutedColor }}>
              {searchMutation.isPending ? 'Searching...' : 'Loading research...'}
            </Text>
          </YStack>
        )}

        {/* Papers List */}
        {!isLoading && papers.length > 0 && (
          <YStack gap="$3">
            {papers.map((paper) => (
              <ResearchCard
                key={paper.id}
                paper={paper}
                isSaved={savedIds.has(paper.id)}
                isSaving={
                  saveMutation.isPending || unsaveMutation.isPending
                }
                onSave={() => handleSave(paper)}
                onUnsave={() => handleUnsave(paper)}
                onPress={() =>
                  router.push(`/(modals)/research/${paper.id}`)
                }
              />
            ))}
          </YStack>
        )}

        {/* Empty State */}
        {!isLoading && papers.length === 0 && (
          <YStack alignItems="center" paddingVertical="$6">
            <Text fontSize={16} textAlign="center" style={{ color: mutedColor }}>
              {isSearching
                ? 'No results found. Try a different search term.'
                : 'No research papers available yet.'}
            </Text>
          </YStack>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  savedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  topicScroll: {
    marginHorizontal: -16,
  },
  topicContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
});
