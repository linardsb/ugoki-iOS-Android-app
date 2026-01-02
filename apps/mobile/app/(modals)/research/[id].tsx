/**
 * Research Paper Detail Screen.
 */

import React, { useMemo, useState } from 'react';
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
  CaretDown,
  CaretUp,
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

// Section labels to make bold in abstracts
const ABSTRACT_LABELS = [
  'CONTEXT:',
  'OBJECTIVE:',
  'OBJECTIVES:',
  'METHODS:',
  'METHOD:',
  'RESULTS:',
  'RESULT:',
  'CONCLUSION:',
  'CONCLUSIONS:',
  'BACKGROUND:',
  'AIM:',
  'AIMS:',
  'PURPOSE:',
  'DESIGN:',
  'SETTING:',
  'PARTICIPANTS:',
  'INTERVENTIONS:',
  'MEASUREMENTS:',
  'FINDINGS:',
];

// Truncate text to ~150 characters at word boundary
function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

// Component to format abstract with bold section labels and collapsible view
function FormattedAbstract({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > 200;

  // Get display text (truncated or full)
  const displayText = isExpanded || !isLong ? text : truncateText(text, 200);

  // Split text by labels while keeping the labels
  const labelPattern = new RegExp(`(${ABSTRACT_LABELS.join('|')})`, 'gi');
  const parts = displayText.split(labelPattern);

  return (
    <YStack>
      <Text fontSize={14} color="#4b5563" lineHeight={22}>
        {parts.map((part, index) => {
          const isLabel = ABSTRACT_LABELS.some(
            (label) => label.toLowerCase() === part.toLowerCase()
          );

          if (isLabel) {
            // Add spacing before label (except first one)
            const needsSpacing = index > 0;
            return (
              <Text key={index}>
                {needsSpacing && '\n\n'}
                <Text fontWeight="700" color="#1f2937">
                  {part}
                </Text>
              </Text>
            );
          }

          return <Text key={index}>{part}</Text>;
        })}
      </Text>

      {isLong && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={{ marginTop: 8 }}
        >
          <XStack alignItems="center" gap="$1">
            <Text fontSize={13} fontWeight="600" color="#14b8a6">
              {isExpanded ? 'Show less' : 'Read full abstract'}
            </Text>
            {isExpanded ? (
              <CaretUp size={14} color="#14b8a6" weight="bold" />
            ) : (
              <CaretDown size={14} color="#14b8a6" weight="bold" />
            )}
          </XStack>
        </TouchableOpacity>
      )}
    </YStack>
  );
}

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

        {/* Research Insights Section */}
        {digest && (
          <YStack gap="$4">
            {/* Key Takeaways */}
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
                  WHO IS THIS FOR
                </Text>
                <Text fontSize={14} color="#1e40af" lineHeight={20}>
                  {digest.who_benefits}
                </Text>
              </YStack>
            )}

            {/* Quick Summary */}
            {digest.tldr && (
              <YStack gap="$2">
                <Text fontSize={14} fontWeight="700" color="#1f2937">
                  Quick Summary
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
            <YStack gap="$2">
              <FormattedAbstract text={paper.abstract} />
            </YStack>
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
