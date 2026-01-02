/**
 * ChallengeCard Component
 * Displays a challenge in list views
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View as RNView, useColorScheme } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/shared/stores/theme';
import { Users, Calendar, Trophy, Clock, Flag } from 'phosphor-react-native';
import type { Challenge, ChallengeStatus } from '../types';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_STATUS_COLORS } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  variant?: 'default' | 'compact';
  onPress?: () => void;
}

export function ChallengeCard({ challenge, variant = 'default', onPress }: ChallengeCardProps) {
  const router = useRouter();

  // Theme - compute effective theme same as root layout
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';

  // Theme-aware colors matching dashboard cards
  const cardBackground = isDark ? '#1c1c1e' : 'white';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const mutedColor = isDark ? '#a1a1aa' : '#6b7280';
  const subtleBackground = isDark ? '#2c2c2e' : '#f3f4f6';
  const progressBg = isDark ? '#3f3f46' : '#e4e4e7';
  const highlightBg = isDark ? '#14b8a620' : '#d1fae5';

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

  const statusColor = CHALLENGE_STATUS_COLORS[challenge.status] || '#6b7280';
  const typeLabel = CHALLENGE_TYPE_LABELS[challenge.challenge_type] || challenge.challenge_type;

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <XStack
          backgroundColor={cardBackground}
          borderRadius="$3"
          padding="$3"
          alignItems="center"
          gap="$3"
        >
          <RNView style={[styles.iconContainer, { backgroundColor: `${statusColor}20` }]}>
            <Flag size={20} color={statusColor} weight="fill" />
          </RNView>
          <YStack flex={1}>
            <Text fontSize={15} fontWeight="600" style={{ color: textColor }} numberOfLines={1}>
              {challenge.name}
            </Text>
            <Text fontSize={12} style={{ color: mutedColor }}>
              {challenge.participant_count} participants
            </Text>
          </YStack>
          {challenge.is_participating && challenge.my_rank && (
            <RNView style={[styles.rankBadge, { backgroundColor: highlightBg }]}>
              <Text fontSize={12} fontWeight="600" color="#14b8a6">
                #{challenge.my_rank}
              </Text>
            </RNView>
          )}
        </XStack>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <YStack backgroundColor={cardBackground} borderRadius="$4" padding="$4" gap="$3">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <Text fontSize={17} fontWeight="700" style={{ color: textColor }}>
              {challenge.name}
            </Text>
            <Text fontSize={13} style={{ color: mutedColor }}>
              {typeLabel}
            </Text>
          </YStack>
          <RNView style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text fontSize={12} fontWeight="600" style={{ color: statusColor }}>
              {challenge.status ? challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1) : 'Unknown'}
            </Text>
          </RNView>
        </XStack>

        {/* Description */}
        {challenge.description && (
          <Text fontSize={14} style={{ color: mutedColor }} numberOfLines={2}>
            {challenge.description}
          </Text>
        )}

        {/* Stats Row */}
        <XStack gap="$4">
          <XStack alignItems="center" gap="$1">
            <Users size={16} color={mutedColor} />
            <Text fontSize={13} style={{ color: mutedColor }}>
              {challenge.participant_count}/{challenge.max_participants}
            </Text>
          </XStack>
          <XStack alignItems="center" gap="$1">
            <Calendar size={16} color={mutedColor} />
            <Text fontSize={13} style={{ color: mutedColor }}>
              {challenge.days_remaining !== null
                ? `${challenge.days_remaining}d left`
                : challenge.status === 'upcoming'
                ? 'Starting soon'
                : 'Ended'}
            </Text>
          </XStack>
          {challenge.my_rank && (
            <XStack alignItems="center" gap="$1">
              <Trophy size={16} color="#14b8a6" />
              <Text fontSize={13} color="#14b8a6" fontWeight="600">
                #{challenge.my_rank}
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Progress Bar (if participating) */}
        {challenge.is_participating && (
          <YStack gap="$2">
            <XStack justifyContent="space-between">
              <Text fontSize={12} style={{ color: mutedColor }}>
                Your Progress
              </Text>
              <Text fontSize={12} fontWeight="600" style={{ color: textColor }}>
                {Math.round(challenge.my_progress || 0)} / {challenge.goal_value}{' '}
                {challenge.goal_unit || ''}
              </Text>
            </XStack>
            <RNView style={[styles.progressBarContainer, { backgroundColor: progressBg }]}>
              <RNView style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </RNView>
          </YStack>
        )}

        {/* Join Code (for own challenges) */}
        {challenge.join_code && challenge.created_by && (
          <XStack
            backgroundColor={subtleBackground}
            borderRadius="$2"
            padding="$2"
            justifyContent="center"
          >
            <Text fontSize={12} style={{ color: mutedColor }}>
              Join Code:{' '}
              <Text fontWeight="700" style={{ color: textColor }}>
                {challenge.join_code}
              </Text>
            </Text>
          </XStack>
        )}
      </YStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 4,
  },
});
