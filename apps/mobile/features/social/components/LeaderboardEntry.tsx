/**
 * LeaderboardEntry Component
 * Displays a single entry in a leaderboard
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView } from 'react-native';
import { XStack, YStack, Text, useTheme } from '@/shared/components/tamagui';
import { useRouter } from 'expo-router';
import { Trophy, Medal } from 'phosphor-react-native';
import type { LeaderboardEntry as LeaderboardEntryType } from '../types';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  valueLabel?: string;
  onPress?: () => void;
}

export function LeaderboardEntryRow({ entry, valueLabel = 'XP', onPress }: LeaderboardEntryProps) {
  const router = useRouter();
  const theme = useTheme();

  // Theme-aware colors from Tamagui theme tokens
  const cardBackground = theme.cardBackground?.val || theme.backgroundHover.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const highlightBg = theme.primaryMuted?.val || theme.backgroundHover.val;
  const highlightBorder = theme.primary?.val || '#3A5BA0';

  // Medal/trophy colors from design system
  const goldColor = theme.secondary?.val || '#FFA387'; // Peach Coral for gold
  const silverColor = theme.colorMuted.val; // Muted for silver
  const bronzeColor = theme.secondary700?.val || '#D07156'; // Darker peach for bronze
  const primaryColor = theme.primary?.val || '#3A5BA0';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(modals)/user/${entry.identity_id}`);
    }
  };

  const name = entry.display_name || entry.username || 'User';
  const initials = name.slice(0, 2).toUpperCase();

  const getRankDisplay = () => {
    if (entry.rank === 1) {
      return <Trophy size={24} color={goldColor} weight="fill" />;
    }
    if (entry.rank === 2) {
      return <Medal size={24} color={silverColor} weight="fill" />;
    }
    if (entry.rank === 3) {
      return <Medal size={24} color={bronzeColor} weight="fill" />;
    }
    return (
      <Text fontSize={16} fontWeight="600" color="$colorMuted" width={24} textAlign="center">
        {entry.rank}
      </Text>
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <XStack
        backgroundColor={entry.is_current_user ? highlightBg : "$cardBackground"}
        borderRadius="$3"
        padding="$3"
        alignItems="center"
        gap="$3"
        borderWidth={entry.is_current_user ? 2 : 1}
        borderColor={entry.is_current_user ? highlightBorder : '$cardBorder'}
      >
        {/* Rank */}
        <RNView style={styles.rankContainer}>{getRankDisplay()}</RNView>

        {/* Avatar */}
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={[styles.avatar, { backgroundColor: theme.backgroundHover.val }]} />
        ) : (
          <RNView style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
            <Text color="white" fontSize={14} fontWeight="600">
              {initials}
            </Text>
          </RNView>
        )}

        {/* User Info */}
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="600" color="$color">
            {name}
            {entry.is_current_user && ' (You)'}
          </Text>
          {entry.username && entry.display_name && (
            <Text fontSize={12} color="$colorMuted">
              @{entry.username}
            </Text>
          )}
        </YStack>

        {/* Value */}
        <YStack alignItems="flex-end">
          <Text fontSize={18} fontWeight="700" color="$color">
            {Math.round(entry.value).toLocaleString()}
          </Text>
          <Text fontSize={11} color="$colorMuted">
            {valueLabel}
          </Text>
        </YStack>
      </XStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
