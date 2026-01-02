/**
 * Research paper card with bite-sized digest.
 */

import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useThemeStore } from '@/shared/stores/theme';
import {
  BookmarkSimple,
  ArrowSquareOut,
  Calendar,
  BookOpen,
} from 'phosphor-react-native';
import type { ResearchPaper } from '../types';
import { TOPIC_METADATA } from '../types';
import { BenefitBadge } from './BenefitBadge';
import { openResearchLink } from './ExternalLinkWarning';
import { getStatusColors } from '../colors';

interface ResearchCardProps {
  paper: ResearchPaper;
  onSave?: () => void;
  onUnsave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  variant?: 'default' | 'compact';
  onPress?: () => void;
}

export function ResearchCard({
  paper,
  onSave,
  onUnsave,
  isSaved = false,
  isSaving = false,
  variant = 'default',
  onPress,
}: ResearchCardProps) {
  // Theme - compute effective theme same as root layout
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';
  const cardBackground = isDark ? '#1c1c1e' : 'white';
  // Use VERY BRIGHT colors for dark mode readability - MUST be explicit for visibility
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const mutedColor = isDark ? '#f5f5f5' : '#6b7280';  // Brightened from #f0f0f0
  const borderColor = isDark ? '#2c2c2e' : '#f3f4f6';
  const successColors = getStatusColors(isDark, 'success');
  const infoColors = getStatusColors(isDark, 'info');

  const topicMeta = TOPIC_METADATA[paper.topic];
  const topicColor = topicMeta?.color || '#6b7280';
  const digest = paper.digest;

  const handleOpenLink = () => {
    openResearchLink(paper.external_url, paper.title);
  };

  const handleSaveToggle = () => {
    if (isSaving) return;
    if (isSaved && onUnsave) {
      onUnsave();
    } else if (!isSaved && onSave) {
      onSave();
    }
  };

  const formattedDate = paper.publication_date
    ? new Date(paper.publication_date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress || handleOpenLink}
        activeOpacity={0.7}
        style={[styles.cardCompact, { backgroundColor: cardBackground }]}
      >
        <YStack gap="$2" flex={1}>
          {/* Topic badge */}
          <XStack
            backgroundColor={`${topicColor}20`}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignSelf="flex-start"
          >
            <Text fontSize={10} fontWeight="600" color={topicColor}>
              {topicMeta?.label || paper.topic}
            </Text>
          </XStack>

          {/* Title */}
          <Text
            fontSize={14}
            fontWeight="600"
            numberOfLines={2}
            style={{ color: textColor }}
          >
            {paper.title}
          </Text>

          {/* One-liner */}
          {digest?.one_liner && (
            <Text fontSize={12} numberOfLines={2} style={{ color: mutedColor }}>
              {digest.one_liner}
            </Text>
          )}

          {/* Meta row */}
          <XStack gap="$3" alignItems="center">
            {formattedDate && (
              <XStack gap="$1" alignItems="center">
                <Calendar size={12} color={mutedColor} />
                <Text fontSize={11} style={{ color: mutedColor }}>
                  {formattedDate}
                </Text>
              </XStack>
            )}
            {paper.journal && (
              <XStack gap="$1" alignItems="center" flex={1}>
                <BookOpen size={12} color={mutedColor} />
                <Text fontSize={11} numberOfLines={1} style={{ color: mutedColor }}>
                  {paper.journal}
                </Text>
              </XStack>
            )}
          </XStack>
        </YStack>

        {/* Action buttons */}
        <YStack gap="$2" alignItems="center">
          <TouchableOpacity
            onPress={handleSaveToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={isSaving}
            style={{ opacity: isSaving ? 0.5 : 1 }}
          >
            <BookmarkSimple
              size={22}
              color={isSaved ? '#f97316' : mutedColor}
              weight={isSaved ? 'fill' : 'regular'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenLink}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowSquareOut size={20} color={mutedColor} />
          </TouchableOpacity>
        </YStack>
      </TouchableOpacity>
    );
  }

  // Default variant - full card with benefits
  return (
    <TouchableOpacity
      onPress={onPress || handleOpenLink}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: cardBackground }]}
    >
      <YStack gap="$3">
        {/* Header: Topic + Actions */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <XStack
            backgroundColor={`${topicColor}20`}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize={11} fontWeight="600" color={topicColor}>
              {topicMeta?.label || paper.topic}
            </Text>
          </XStack>

          <XStack gap="$3">
            <TouchableOpacity
              onPress={handleSaveToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={isSaving}
              style={{ opacity: isSaving ? 0.5 : 1 }}
            >
              <BookmarkSimple
                size={24}
                color={isSaved ? '#f97316' : mutedColor}
                weight={isSaved ? 'fill' : 'regular'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenLink}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowSquareOut size={22} color={mutedColor} />
            </TouchableOpacity>
          </XStack>
        </XStack>

        {/* Title */}
        <Text fontSize={16} fontWeight="700" lineHeight={22} style={{ color: textColor }}>
          {paper.title}
        </Text>

        {/* One-liner summary */}
        {digest?.one_liner && (
          <Text fontSize={14} lineHeight={20} style={{ color: mutedColor }}>
            {digest.one_liner}
          </Text>
        )}

        {/* Key benefits */}
        {digest?.key_benefits && digest.key_benefits.length > 0 && (
          <YStack gap="$2">
            <Text fontSize={12} fontWeight="600" style={{ color: textColor, opacity: 0.8 }}>
              KEY TAKEAWAYS
            </Text>
            {digest.key_benefits.slice(0, 3).map((benefit, index) => (
              <BenefitBadge key={index} benefit={benefit} />
            ))}
          </YStack>
        )}

        {/* Who benefits */}
        {digest?.who_benefits && (
          <YStack
            backgroundColor={successColors.bg}
            borderRadius="$2"
            padding="$2"
            gap="$1"
          >
            <Text fontSize={11} fontWeight="600" color={successColors.text}>
              WHO BENEFITS
            </Text>
            <Text fontSize={13} color={successColors.text} opacity={0.9}>
              {digest.who_benefits}
            </Text>
          </YStack>
        )}

        {/* Meta footer */}
        <XStack
          gap="$3"
          alignItems="center"
          paddingTop="$2"
          borderTopWidth={1}
          borderTopColor={borderColor}
        >
          {formattedDate && (
            <XStack gap="$1" alignItems="center">
              <Calendar size={14} color={mutedColor} />
              <Text fontSize={12} style={{ color: mutedColor }}>
                {formattedDate}
              </Text>
            </XStack>
          )}
          {paper.journal && (
            <XStack gap="$1" alignItems="center" flex={1}>
              <BookOpen size={14} color={mutedColor} />
              <Text fontSize={12} numberOfLines={1} style={{ color: mutedColor }}>
                {paper.journal}
              </Text>
            </XStack>
          )}
          {paper.open_access && (
            <XStack
              backgroundColor={infoColors.bg}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$1"
            >
              <Text fontSize={10} fontWeight="600" color={infoColors.text}>
                Open Access
              </Text>
            </XStack>
          )}
        </XStack>
      </YStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompact: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
});
