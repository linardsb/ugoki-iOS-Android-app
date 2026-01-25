/**
 * ChallengeCard Component
 * Displays a challenge in list views
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { Users, Calendar, Trophy, Flag } from 'phosphor-react-native';
import { Card, ProgressBar, IconButton } from '@/shared/components/ui';
import type { Challenge, ChallengeStatus } from '../types';
import { CHALLENGE_TYPE_LABELS } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  variant?: 'default' | 'compact';
  onPress?: () => void;
}

// Map status to semantic theme colors
const getStatusColors = (status: ChallengeStatus, theme: ReturnType<typeof useTheme>) => {
  switch (status) {
    case 'upcoming':
      return {
        bg: theme.primaryMuted?.val || theme.backgroundHover.val,
        text: theme.primary.val,
      };
    case 'active':
      return {
        bg: theme.successMuted?.val || theme.backgroundHover.val,
        text: theme.success.val,
      };
    case 'completed':
      return {
        bg: theme.backgroundHover.val,
        text: theme.colorMuted.val,
      };
    default:
      return {
        bg: theme.backgroundHover.val,
        text: theme.colorMuted.val,
      };
  }
};

export function ChallengeCard({ challenge, variant = 'default', onPress }: ChallengeCardProps) {
  const router = useRouter();
  const theme = useTheme();

  const mutedColor = theme.colorMuted.val;
  const primaryColor = theme.primary.val;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/challenges/${challenge.id}`);
    }
  };

  const progressPercent = challenge.my_progress
    ? Math.min(100, (challenge.my_progress / challenge.goal_value) * 100)
    : 0;

  const statusColors = getStatusColors(challenge.status, theme);
  const typeLabel = CHALLENGE_TYPE_LABELS[challenge.challenge_type] || challenge.challenge_type;

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Card padded="sm">
          <XStack alignItems="center" gap="$3">
            <XStack
              width={40}
              height={40}
              borderRadius="$full"
              backgroundColor={statusColors.bg}
              alignItems="center"
              justifyContent="center"
            >
              <Flag size={20} color={statusColors.text} weight="fill" />
            </XStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
                {challenge.name}
              </Text>
              <Text fontSize="$2" color="$colorMuted">
                {challenge.participant_count} participants
              </Text>
            </YStack>
            {challenge.is_participating && challenge.my_rank && (
              <XStack
                backgroundColor="$primaryMuted"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$lg"
              >
                <Text fontSize="$2" fontWeight="600" color="$primary">
                  #{challenge.my_rank}
                </Text>
              </XStack>
            )}
          </XStack>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card>
        <YStack gap="$3">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap="$1">
              <Text fontSize="$5" fontWeight="700" color="$color">
                {challenge.name}
              </Text>
              <Text fontSize="$2" color="$colorMuted">
                {typeLabel}
              </Text>
            </YStack>
            <XStack
              backgroundColor={statusColors.bg}
              paddingHorizontal="$2.5"
              paddingVertical="$1"
              borderRadius="$lg"
            >
              <Text fontSize="$2" fontWeight="600" color={statusColors.text}>
                {challenge.status ? challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1) : 'Unknown'}
              </Text>
            </XStack>
          </XStack>

          {/* Description */}
          {challenge.description && (
            <Text fontSize="$3" color="$colorMuted" numberOfLines={2}>
              {challenge.description}
            </Text>
          )}

          {/* Stats Row */}
          <XStack gap="$4">
            <XStack alignItems="center" gap="$1">
              <Users size={16} color={mutedColor} />
              <Text fontSize="$2" color="$colorMuted">
                {challenge.participant_count}/{challenge.max_participants}
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <Calendar size={16} color={mutedColor} />
              <Text fontSize="$2" color="$colorMuted">
                {challenge.days_remaining !== null
                  ? `${challenge.days_remaining}d left`
                  : challenge.status === 'upcoming'
                  ? 'Starting soon'
                  : 'Ended'}
              </Text>
            </XStack>
            {challenge.my_rank && (
              <XStack alignItems="center" gap="$1">
                <Trophy size={16} color={primaryColor} />
                <Text fontSize="$2" color="$primary" fontWeight="600">
                  #{challenge.my_rank}
                </Text>
              </XStack>
            )}
          </XStack>

          {/* Progress Bar (if participating) */}
          {challenge.is_participating && (
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$2" color="$colorMuted">
                  Your Progress
                </Text>
                <Text fontSize="$2" fontWeight="600" color="$color">
                  {Math.round(challenge.my_progress || 0)} / {challenge.goal_value}{' '}
                  {challenge.goal_unit || ''}
                </Text>
              </XStack>
              <ProgressBar
                progress={progressPercent}
                height={8}
                variant="rounded"
              />
            </YStack>
          )}

          {/* Join Code (for own challenges) */}
          {challenge.join_code && challenge.created_by && (
            <XStack
              backgroundColor="$backgroundHover"
              borderRadius="$2"
              padding="$2"
              justifyContent="center"
            >
              <Text fontSize="$2" color="$colorMuted">
                Join Code:{' '}
                <Text fontWeight="700" color="$color">
                  {challenge.join_code}
                </Text>
              </Text>
            </XStack>
          )}
        </YStack>
      </Card>
    </TouchableOpacity>
  );
}
