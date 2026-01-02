/**
 * Research Paper Detail Screen.
 */

import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  BookmarkSimple,
  ArrowSquareOut,
  Calendar,
  BookOpen,
  User,
  Sparkle,
} from 'phosphor-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ScreenHeader } from '@/shared/components/ui';
import {
  usePaper,
  useSavedResearch,
  useSaveResearch,
  useUnsaveResearch,
} from '@/features/research/hooks';
import { BenefitBadge, openResearchLink } from '@/features/research/components';
import { TOPIC_METADATA } from '@/features/research/types';

export default function ResearchDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Queries
  const { data: paper, isLoading, error } = usePaper(id, !!id);
  const { data: savedPapers } = useSavedResearch();

  // Mutations
  const saveMutation = useSaveResearch();
  const unsaveMutation = useUnsaveResearch();

  // Check if saved
  const savedRecord = useMemo(() => {
    return savedPapers?.find((s) => s.research_id === id);
  }, [savedPapers, id]);
  const isSaved = !!savedRecord;

  const handleSaveToggle = () => {
    if (saveMutation.isPending || unsaveMutation.isPending) return;
    if (isSaved && savedRecord) {
      unsaveMutation.mutate(savedRecord.id);
    } else if (paper) {
      saveMutation.mutate({ researchId: paper.id });
    }
  };

  const handleOpenLink = () => {
    if (paper) {
      openResearchLink(paper.external_url, paper.title);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Research" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text fontSize={14} color="#6b7280" marginTop="$2">
            Loading paper...
          </Text>
        </YStack>
      </View>
    );
  }

  if (error || !paper) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Research" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text fontSize={16} color="#dc2626" textAlign="center">
            Failed to load paper. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          >
            <Text fontSize={14} color="#14b8a6" fontWeight="600">
              Go Back
            </Text>
          </TouchableOpacity>
        </YStack>
      </View>
    );
  }

  const topicMeta = TOPIC_METADATA[paper.topic];
  const topicColor = topicMeta?.color || '#6b7280';
  const digest = paper.digest;

  const formattedDate = paper.publication_date
    ? new Date(paper.publication_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Research"
        showClose
        rightAction={
          <XStack gap="$3">
            <TouchableOpacity onPress={handleSaveToggle}>
              <BookmarkSimple
                size={24}
                color={isSaved ? '#f97316' : '#6b7280'}
                weight={isSaved ? 'fill' : 'regular'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenLink}>
              <ArrowSquareOut size={24} color="#6b7280" />
            </TouchableOpacity>
          </XStack>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topic Badge */}
        <XStack marginBottom="$2">
          <XStack
            backgroundColor={`${topicColor}20`}
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize={12} fontWeight="600" color={topicColor}>
              {topicMeta?.label || paper.topic}
            </Text>
          </XStack>
          {paper.open_access && (
            <XStack
              backgroundColor="#dbeafe"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              marginLeft="$2"
            >
              <Text fontSize={11} fontWeight="600" color="#2563eb">
                Open Access
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Title */}
        <Text
          fontSize={22}
          fontWeight="700"
          color="#1f2937"
          lineHeight={28}
          marginBottom="$3"
        >
          {paper.title}
        </Text>

        {/* Meta Info */}
        <YStack gap="$2" marginBottom="$4">
          {paper.authors && paper.authors.length > 0 && (
            <XStack gap="$2" alignItems="flex-start">
              <User size={16} color="#6b7280" style={{ marginTop: 2 }} />
              <Text fontSize={13} color="#6b7280" flex={1}>
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
              </Text>
            </XStack>
          )}
          {paper.journal && (
            <XStack gap="$2" alignItems="center">
              <BookOpen size={16} color="#6b7280" />
              <Text fontSize={13} color="#6b7280" flex={1}>
                {paper.journal}
              </Text>
            </XStack>
          )}
          {formattedDate && (
            <XStack gap="$2" alignItems="center">
              <Calendar size={16} color="#6b7280" />
              <Text fontSize={13} color="#6b7280">
                {formattedDate}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* AI Summary Section */}
        {digest && (
          <YStack gap="$4">
            {/* Quick Summary */}
            <YStack
              backgroundColor="#f0fdf4"
              borderRadius="$4"
              padding="$4"
              borderLeftWidth={4}
              borderLeftColor="#14b8a6"
            >
              <XStack gap="$2" alignItems="center" marginBottom="$2">
                <Sparkle size={18} color="#14b8a6" weight="fill" />
                <Text fontSize={12} fontWeight="700" color="#14b8a6">
                  AI SUMMARY
                </Text>
              </XStack>
              <Text fontSize={15} color="#166534" lineHeight={22}>
                {digest.one_liner}
              </Text>
            </YStack>

            {/* Key Benefits */}
            {digest.key_benefits && digest.key_benefits.length > 0 && (
              <YStack gap="$2">
                <Text fontSize={14} fontWeight="700" color="#1f2937">
                  Key Takeaways
                </Text>
                {digest.key_benefits.map((benefit, index) => (
                  <BenefitBadge key={index} benefit={benefit} />
                ))}
              </YStack>
            )}

            {/* Who Benefits */}
            {digest.who_benefits && (
              <YStack
                backgroundColor="#eff6ff"
                borderRadius="$3"
                padding="$3"
                gap="$1"
              >
                <Text fontSize={12} fontWeight="700" color="#2563eb">
                  WHO BENEFITS
                </Text>
                <Text fontSize={14} color="#1e40af" lineHeight={20}>
                  {digest.who_benefits}
                </Text>
              </YStack>
            )}

            {/* TL;DR */}
            {digest.tldr && (
              <YStack gap="$2">
                <Text fontSize={14} fontWeight="700" color="#1f2937">
                  TL;DR
                </Text>
                <Text fontSize={14} color="#4b5563" lineHeight={22}>
                  {digest.tldr}
                </Text>
              </YStack>
            )}
          </YStack>
        )}

        {/* Abstract */}
        {paper.abstract && (
          <YStack marginTop="$4" gap="$2">
            <Text fontSize={14} fontWeight="700" color="#1f2937">
              Abstract
            </Text>
            <Text fontSize={14} color="#4b5563" lineHeight={22}>
              {paper.abstract}
            </Text>
          </YStack>
        )}

        {/* External Link Button */}
        <TouchableOpacity
          onPress={handleOpenLink}
          style={styles.externalButton}
          activeOpacity={0.8}
        >
          <ArrowSquareOut size={20} color="white" />
          <Text fontSize={16} fontWeight="600" color="white">
            View Full Paper
          </Text>
        </TouchableOpacity>

        {/* Source Info */}
        <YStack marginTop="$4" alignItems="center">
          <Text fontSize={11} color="#9ca3af">
            Source: {paper.source.toUpperCase()}
            {paper.pmid && ` • PMID: ${paper.pmid}`}
          </Text>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
});
