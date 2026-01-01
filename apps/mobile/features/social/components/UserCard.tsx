/**
 * UserCard Component
 * Displays a user in lists (friends, followers, search results)
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';

interface UserCardProps {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number | null;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export function UserCard({
  userId,
  username,
  displayName,
  avatarUrl,
  level,
  subtitle,
  rightElement,
  onPress,
  showChevron = true,
}: UserCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/user/${userId}`);
    }
  };

  const name = displayName || username || 'User';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <XStack
        backgroundColor="white"
        borderRadius="$3"
        padding="$3"
        alignItems="center"
        gap="$3"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <RNView style={styles.avatarPlaceholder}>
            <Text color="white" fontSize={16} fontWeight="600">
              {initials}
            </Text>
          </RNView>
        )}

        {/* User Info */}
        <YStack flex={1} gap="$1">
          <Text fontSize={16} fontWeight="600" color="$color">
            {name}
          </Text>
          {username && displayName && (
            <Text fontSize={13} color="#6b7280">
              @{username}
            </Text>
          )}
          {subtitle && (
            <Text fontSize={13} color="#6b7280">
              {subtitle}
            </Text>
          )}
        </YStack>

        {/* Level Badge */}
        {level && (
          <RNView style={styles.levelBadge}>
            <Text fontSize={12} fontWeight="600" color="#14b8a6">
              Lvl {level}
            </Text>
          </RNView>
        )}

        {/* Right Element or Chevron */}
        {rightElement}
        {showChevron && !rightElement && (
          <CaretRight size={20} color="#6b7280" weight="regular" />
        )}
      </XStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e4e4e7',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
