/**
 * LeaderboardEntry Component
 * Displays a single entry in a leaderboard
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
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

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/user/${entry.identity_id}`);
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
      <Text fontSize={16} fontWeight="600" color="#6b7280" width={24} textAlign="center">
        {entry.rank}
      </Text>
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <XStack
        backgroundColor={entry.is_current_user ? '#d1fae5' : 'white'}
        borderRadius="$3"
        padding="$3"
        alignItems="center"
        gap="$3"
        borderWidth={entry.is_current_user ? 2 : 0}
        borderColor={entry.is_current_user ? '#14b8a6' : 'transparent'}
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
          <Text fontSize={15} fontWeight="600" color="$color">
            {name}
            {entry.is_current_user && ' (You)'}
          </Text>
          {entry.username && entry.display_name && (
            <Text fontSize={12} color="#6b7280">
              @{entry.username}
            </Text>
          )}
        </YStack>

        {/* Value */}
        <YStack alignItems="flex-end">
          <Text fontSize={18} fontWeight="700" color="$color">
            {Math.round(entry.value).toLocaleString()}
          </Text>
          <Text fontSize={11} color="#6b7280">
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
