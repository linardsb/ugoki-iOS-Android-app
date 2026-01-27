/**
 * Research paper card with bite-sized digest.
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';
import {
  BookmarkSimple,
  ArrowSquareOut,
  Calendar,
  BookOpen,
} from 'phosphor-react-native';
import { Card } from '@/shared/components/ui';
import type { ResearchPaper } from '../types';
import { TOPIC_METADATA } from '../types';
import { BenefitBadge } from './BenefitBadge';
import { openResearchLink } from './ExternalLinkWarning';

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
  const theme = useTheme();

  // Theme colors from tokens
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const borderColor = theme.borderColor.val;
  const secondaryColor = theme.secondary.val;
  const successBg = theme.successSubtle?.val || theme.backgroundHover.val;
  const successText = theme.success?.val || theme.primary.val;
  const infoBg = theme.infoSubtle?.val || theme.backgroundHover.val;
  const infoText = theme.info?.val || theme.primary.val;

  const topicMeta = TOPIC_METADATA[paper.topic];
  const topicColor = topicMeta?.color || mutedColor;
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
      <TouchableOpacity onPress={onPress || handleOpenLink} activeOpacity={0.7}>
        <Card padded="sm" elevated="sm">
          <XStack gap="$3">
            <YStack gap="$2" flex={1}>
              {/* Topic badge */}
              <XStack
                backgroundColor={`${topicColor}20`}
                paddingHorizontal="$3"
                paddingVertical="$1.5"
                borderRadius="$2"
                alignSelf="flex-start"
              >
                <Text fontSize="$3" fontWeight="600" color={topicColor}>
                  {topicMeta?.label || paper.topic}
                </Text>
              </XStack>

              {/* Title */}
              <Text
                fontSize="$3"
                fontWeight="600"
                numberOfLines={2}
                color="$color"
              >
                {paper.title}
              </Text>

              {/* One-liner */}
              {digest?.one_liner && (
                <Text fontSize="$3" numberOfLines={2} color="$colorMuted">
                  {digest.one_liner}
                </Text>
              )}

              {/* Meta row */}
              <XStack gap="$3" alignItems="center">
                {formattedDate && (
                  <XStack gap="$1" alignItems="center">
                    <Calendar size={16} color={mutedColor} />
                    <Text fontSize="$3" color="$colorMuted">
                      {formattedDate}
                    </Text>
                  </XStack>
                )}
                {paper.journal && (
                  <XStack gap="$1" alignItems="center" flex={1}>
                    <BookOpen size={16} color={mutedColor} />
                    <Text fontSize="$3" numberOfLines={1} color="$colorMuted">
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
                  color={isSaved ? secondaryColor : mutedColor}
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
          </XStack>
        </Card>
      </TouchableOpacity>
    );
  }

  // Default variant - full card with benefits
  return (
    <TouchableOpacity onPress={onPress || handleOpenLink} activeOpacity={0.8}>
      <Card elevated="md">
        <YStack gap="$3">
          {/* Header: Topic + Actions */}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <XStack
              backgroundColor={`${topicColor}20`}
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$2"
            >
              <Text fontSize="$3" fontWeight="600" color={topicColor}>
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
                  color={isSaved ? secondaryColor : mutedColor}
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
          <Text fontSize="$4" fontWeight="700" lineHeight={22} color="$color">
            {paper.title}
          </Text>

          {/* One-liner summary */}
          {digest?.one_liner && (
            <Text fontSize="$3" lineHeight={20} color="$colorMuted">
              {digest.one_liner}
            </Text>
          )}

          {/* Key benefits */}
          {digest?.key_benefits && digest.key_benefits.length > 0 && (
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$color" opacity={0.8}>
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
              backgroundColor={successBg}
              borderRadius="$2"
              padding="$2"
              gap="$1"
            >
              <Text fontSize="$3" fontWeight="600" color={successText}>
                WHO BENEFITS
              </Text>
              <Text fontSize="$3" color={successText} opacity={0.9}>
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
            borderTopColor="$borderColor"
          >
            {formattedDate && (
              <XStack gap="$1" alignItems="center">
                <Calendar size={16} color={mutedColor} />
                <Text fontSize="$3" color="$colorMuted">
                  {formattedDate}
                </Text>
              </XStack>
            )}
            {paper.journal && (
              <XStack gap="$1" alignItems="center" flex={1}>
                <BookOpen size={16} color={mutedColor} />
                <Text fontSize="$3" numberOfLines={1} color="$colorMuted">
                  {paper.journal}
                </Text>
              </XStack>
            )}
            {paper.open_access && (
              <XStack
                backgroundColor={infoBg}
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$1"
              >
                <Text fontSize="$3" fontWeight="600" color={infoText}>
                  Open Access
                </Text>
              </XStack>
            )}
          </XStack>
        </YStack>
      </Card>
    </TouchableOpacity>
  );
}
