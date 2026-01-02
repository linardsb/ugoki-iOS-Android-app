/**
 * LeaderboardEntry Component
 * Displays a single entry in a leaderboard
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView, useColorScheme } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/shared/stores/theme';
import { Trophy, Medal } from 'phosphor-react-native';
import type { LeaderboardEntry as LeaderboardEntryType } from '../types';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  valueLabel?: string;
  onPress?: () => void;
}

export function LeaderboardEntryRow({ entry, valueLabel = 'XP', onPress }: LeaderboardEntryProps) {
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
  const highlightBg = isDark ? '#14b8a630' : '#d1fae5';
  const highlightBorder = '#14b8a6';

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
      return <Trophy size={24} color="#eab308" weight="fill" />;
    }
    if (entry.rank === 2) {
      return <Medal size={24} color="#9ca3af" weight="fill" />;
    }
    if (entry.rank === 3) {
      return <Medal size={24} color="#d97706" weight="fill" />;
    }
    return (
      <Text fontSize={16} fontWeight="600" style={{ color: mutedColor }} width={24} textAlign="center">
        {entry.rank}
      </Text>
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <XStack
        backgroundColor={entry.is_current_user ? highlightBg : cardBackground}
        borderRadius="$3"
        padding="$3"
        alignItems="center"
        gap="$3"
        borderWidth={entry.is_current_user ? 2 : 0}
        borderColor={entry.is_current_user ? highlightBorder : 'transparent'}
      >
        {/* Rank */}
        <RNView style={styles.rankContainer}>{getRankDisplay()}</RNView>

        {/* Avatar */}
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
        ) : (
          <RNView style={styles.avatarPlaceholder}>
            <Text color="white" fontSize={14} fontWeight="600">
              {initials}
            </Text>
          </RNView>
        )}

        {/* User Info */}
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="600" style={{ color: textColor }}>
            {name}
            {entry.is_current_user && ' (You)'}
          </Text>
          {entry.username && entry.display_name && (
            <Text fontSize={12} style={{ color: mutedColor }}>
              @{entry.username}
            </Text>
          )}
        </YStack>

        {/* Value */}
        <YStack alignItems="flex-end">
          <Text fontSize={18} fontWeight="700" style={{ color: textColor }}>
            {Math.round(entry.value).toLocaleString()}
          </Text>
          <Text fontSize={11} style={{ color: mutedColor }}>
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
    backgroundColor: '#e4e4e7',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
