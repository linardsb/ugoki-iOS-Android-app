/**
 * Research Paper Detail Screen.
 * Uses theme tokens for consistent styling.
 */

import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, useTheme } from 'tamagui';
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
import { AbstractBullets } from '@/features/research/components/AbstractBullets';
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

// Component to format abstract with collapsible view
function FormattedAbstract({ text, bodyColor, linkColor }: { text: string; bodyColor: string; linkColor: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > 200;

  // Get display text (truncated or full)
  const displayText = isExpanded || !isLong ? text : truncateText(text, 200);

  return (
    <YStack>
      <Text
        fontSize={14}
        lineHeight={22}
        style={{ color: bodyColor }}
      >
        {displayText}
      </Text>

      {isLong && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={{ marginTop: 8 }}
        >
          <XStack alignItems="center" gap="$1">
            <Text fontSize={13} fontWeight="600" style={{ color: linkColor }}>
              {isExpanded ? 'Show less' : 'Read full abstract'}
            </Text>
            {isExpanded ? (
              <CaretUp size={14} color={linkColor} weight="bold" />
            ) : (
              <CaretDown size={14} color={linkColor} weight="bold" />
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

  // Theme colors from tokens
  const theme = useTheme();
  const backgroundColor = theme.background.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const bodyColor = theme.color.val;
  const primaryColor = theme.primary.val;
  const secondaryColor = theme.secondary.val;
  const errorColor = theme.error?.val || '#dc2626';
  const infoBg = theme.infoSubtle?.val || theme.primarySubtle?.val || theme.backgroundHover.val;
  const infoText = theme.info?.val || theme.primary.val;

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
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Research" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={primaryColor} />
          <Text fontSize={14} marginTop="$2" style={{ color: mutedColor }}>
            Loading paper...
          </Text>
        </YStack>
      </View>
    );
  }

  if (error || !paper) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Research" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text fontSize={16} style={{ color: errorColor }} textAlign="center">
            Failed to load paper. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          >
            <Text fontSize={14} style={{ color: primaryColor }} fontWeight="600">
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
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader
        title="Research"
        showClose
        rightAction={
          <XStack gap="$3">
            <TouchableOpacity onPress={handleSaveToggle}>
              <BookmarkSimple
                size={24}
                color={isSaved ? secondaryColor : mutedColor}
                weight={isSaved ? 'fill' : 'regular'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenLink}>
              <ArrowSquareOut size={24} color={mutedColor} />
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
              backgroundColor={infoBg}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              marginLeft="$2"
            >
              <Text fontSize={11} fontWeight="600" style={{ color: infoText }}>
                Open Access
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Title */}
        <Text
          fontSize={22}
          fontWeight="700"
          lineHeight={28}
          marginBottom="$3"
          style={{ color: textColor }}
        >
          {paper.title}
        </Text>

        {/* Meta Info */}
        <YStack gap="$2" marginBottom="$4">
          {paper.authors && paper.authors.length > 0 && (
            <XStack gap="$2" alignItems="flex-start">
              <User size={16} color={mutedColor} style={{ marginTop: 2 }} />
              <Text fontSize={13} flex={1} style={{ color: mutedColor }}>
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
              </Text>
            </XStack>
          )}
          {paper.journal && (
            <XStack gap="$2" alignItems="center">
              <BookOpen size={16} color={mutedColor} />
              <Text fontSize={13} flex={1} style={{ color: mutedColor }}>
                {paper.journal}
              </Text>
            </XStack>
          )}
          {formattedDate && (
            <XStack gap="$2" alignItems="center">
              <Calendar size={16} color={mutedColor} />
              <Text fontSize={13} style={{ color: mutedColor }}>
                {formattedDate}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Research Insights Section */}
        {digest && (
          <YStack gap="$4">
            {/* At a Glance - Abstract Bullet Summary */}
            {digest.abstract_bullets && digest.abstract_bullets.length > 0 && (
              <YStack gap="$2">
                <Text fontSize={14} fontWeight="700" style={{ color: textColor }}>
                  At a Glance
                </Text>
                <AbstractBullets bullets={digest.abstract_bullets} />
              </YStack>
            )}

            {/* Key Takeaways */}
            {digest.key_benefits && digest.key_benefits.length > 0 && (
              <YStack gap="$2">
                <Text fontSize={14} fontWeight="700" style={{ color: textColor }}>
                  Key Takeaways
                </Text>
                {digest.key_benefits.map((benefit, index) => (
                  <BenefitBadge key={index} benefit={benefit} />
                ))}
              </YStack>
            )}

            {/* Audience Tags */}
            {digest.audience_tags && digest.audience_tags.length > 0 && (
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="700" style={{ color: mutedColor }}>
                  WHO IS THIS FOR
                </Text>
                <XStack flexWrap="wrap" gap="$2">
                  {digest.audience_tags.map((tag, index) => (
                    <XStack
                      key={index}
                      backgroundColor={infoBg}
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius="$4"
                    >
                      <Text fontSize={13} fontWeight="600" style={{ color: infoText }}>
                        {tag}
                      </Text>
                    </XStack>
                  ))}
                </XStack>
              </YStack>
            )}

            {/* Quick Summary */}
            {digest.tldr && (
              <YStack gap="$2">
                <Text fontSize={14} fontWeight="700" style={{ color: textColor }}>
                  Quick Summary
                </Text>
                <Text fontSize={14} lineHeight={22} style={{ color: bodyColor }}>
                  {digest.tldr}
                </Text>
              </YStack>
            )}
          </YStack>
        )}

        {/* Abstract */}
        {paper.abstract && (
          <YStack marginTop="$4" gap="$2">
            <Text fontSize={14} fontWeight="700" style={{ color: textColor }}>
              Abstract
            </Text>
            <FormattedAbstract text={paper.abstract} bodyColor={bodyColor} linkColor={primaryColor} />
          </YStack>
        )}

        {/* External Link Button */}
        <TouchableOpacity
          onPress={handleOpenLink}
          style={[styles.externalButton, { backgroundColor: primaryColor }]}
          activeOpacity={0.8}
        >
          <ArrowSquareOut size={20} color="white" />
          <Text fontSize={16} fontWeight="600" color="white">
            View Full Paper
          </Text>
        </TouchableOpacity>

        {/* Source Info */}
        <YStack marginTop="$4" alignItems="center">
          <Text fontSize={11} style={{ color: mutedColor }}>
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
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
});
