/**
 * ChallengeTemplateCard Component
 * Displays a challenge template with quick-launch functionality
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { XStack, YStack, Text, useTheme } from '@/shared/components/tamagui';
import { Fire, Barbell, Trophy, Lightning, Target, Calendar, Play } from 'phosphor-react-native';
import { Card, AppButton } from '@/shared/components/ui';
import type { ChallengeTemplate, ChallengeType } from '../types';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_UNITS } from '../types';

interface ChallengeTemplateCardProps {
  template: ChallengeTemplate;
  onLaunch: (template: ChallengeTemplate) => void;
  variant?: 'default' | 'compact';
}

// Get icon component based on template icon string
const getTemplateIcon = (icon: string | null, color: string, size: number = 24) => {
  switch (icon?.toLowerCase()) {
    case 'fire':
      return <Fire size={size} color={color} weight="fill" />;
    case 'barbell':
      return <Barbell size={size} color={color} weight="fill" />;
    case 'trophy':
      return <Trophy size={size} color={color} weight="fill" />;
    case 'lightning':
      return <Lightning size={size} color={color} weight="fill" />;
    case 'target':
      return <Target size={size} color={color} weight="fill" />;
    case 'calendar':
      return <Calendar size={size} color={color} weight="fill" />;
    default:
      // Default based on challenge type
      return <Trophy size={size} color={color} weight="fill" />;
  }
};

// Map challenge type to theme colors
const getTypeColors = (type: ChallengeType, theme: ReturnType<typeof useTheme>) => {
  switch (type) {
    case 'fasting_streak':
      return {
        bg: theme.warningMuted?.val || theme.backgroundHover.val,
        text: theme.warning?.val || theme.primary.val,
      };
    case 'workout_count':
      return {
        bg: theme.successMuted?.val || theme.backgroundHover.val,
        text: theme.success.val,
      };
    case 'total_xp':
      return {
        bg: theme.primaryMuted?.val || theme.backgroundHover.val,
        text: theme.primary.val,
      };
    case 'consistency':
      return {
        bg: theme.infoMuted?.val || theme.backgroundHover.val,
        text: theme.info?.val || theme.primary.val,
      };
    default:
      return {
        bg: theme.backgroundHover.val,
        text: theme.colorMuted.val,
      };
  }
};

export function ChallengeTemplateCard({
  template,
  onLaunch,
  variant = 'default',
}: ChallengeTemplateCardProps) {
  const theme = useTheme();

  const mutedColor = theme.colorMuted.val;
  const typeColors = getTypeColors(template.challenge_type, theme);
  const typeLabel = CHALLENGE_TYPE_LABELS[template.challenge_type] || template.challenge_type;
  const typeUnit = CHALLENGE_TYPE_UNITS[template.challenge_type] || '';

  const handleLaunch = () => {
    Alert.alert(
      `Start ${template.name}?`,
      `This will create a ${template.duration_days}-day challenge. You can invite friends after creating it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Challenge', onPress: () => onLaunch(template) },
      ]
    );
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handleLaunch} activeOpacity={0.7}>
        <Card padded="sm">
          <XStack alignItems="center" gap="$3">
            <XStack
              width={44}
              height={44}
              borderRadius="$full"
              backgroundColor={typeColors.bg}
              alignItems="center"
              justifyContent="center"
            >
              {getTemplateIcon(template.icon, typeColors.text, 22)}
            </XStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
                {template.name}
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                {template.duration_days} days
              </Text>
            </YStack>
            <XStack
              backgroundColor="$primary"
              width={36}
              height={36}
              borderRadius="$full"
              alignItems="center"
              justifyContent="center"
            >
              <Play size={18} color="white" weight="fill" />
            </XStack>
          </XStack>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card>
      <YStack gap="$3">
        {/* Header with Icon */}
        <XStack gap="$3" alignItems="center">
          <XStack
            width={52}
            height={52}
            borderRadius="$lg"
            backgroundColor={typeColors.bg}
            alignItems="center"
            justifyContent="center"
          >
            {getTemplateIcon(template.icon, typeColors.text, 28)}
          </XStack>
          <YStack flex={1} gap="$1">
            <Text fontSize="$5" fontWeight="700" color="$color">
              {template.name}
            </Text>
            <XStack gap="$2" alignItems="center">
              <XStack
                backgroundColor={typeColors.bg}
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$sm"
              >
                <Text fontSize="$2" fontWeight="500" color={typeColors.text}>
                  {typeLabel}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </XStack>

        {/* Description */}
        {template.description && (
          <Text fontSize="$3" color="$colorMuted" numberOfLines={2}>
            {template.description}
          </Text>
        )}

        {/* Stats Row */}
        <XStack gap="$4">
          <XStack alignItems="center" gap="$2">
            <Calendar size={18} color={mutedColor} />
            <Text fontSize="$3" color="$colorMuted">
              {template.duration_days} days
            </Text>
          </XStack>
          <XStack alignItems="center" gap="$2">
            <Target size={18} color={mutedColor} />
            <Text fontSize="$3" color="$colorMuted">
              Goal: {template.goal_value} {typeUnit}
            </Text>
          </XStack>
        </XStack>

        {/* Launch Button */}
        <AppButton
          onPress={handleLaunch}
          size="md"
          variant="primary"
          icon={<Play size={18} color="white" weight="fill" />}
        >
          Start Challenge
        </AppButton>
      </YStack>
    </Card>
  );
}
