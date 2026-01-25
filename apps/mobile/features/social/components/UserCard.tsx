/**
 * UserCard Component
 * Displays a user in lists (friends, followers, search results)
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';
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
  const theme = useTheme();

  // Theme-aware colors from Tamagui theme tokens
  const primaryColor = theme.primary?.val || '#3A5BA0';
  const primaryBgColor = theme.primaryMuted?.val || theme.backgroundHover.val;
  const mutedColor = theme.colorMuted.val;

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
        backgroundColor="$cardBackground"
        borderRadius="$3"
        padding="$3"
        alignItems="center"
        gap="$3"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={[styles.avatar, { backgroundColor: theme.backgroundHover.val }]} />
        ) : (
          <RNView style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
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
            <Text fontSize={13} color="$colorMuted">
              @{username}
            </Text>
          )}
          {subtitle && (
            <Text fontSize={13} color="$colorMuted">
              {subtitle}
            </Text>
          )}
        </YStack>

        {/* Level Badge */}
        {level && (
          <RNView style={[styles.levelBadge, { backgroundColor: primaryBgColor }]}>
            <Text fontSize={12} fontWeight="600" color="$primary">
              Lvl {level}
            </Text>
          </RNView>
        )}

        {/* Right Element or Chevron */}
        {rightElement}
        {showChevron && !rightElement && (
          <CaretRight size={20} color={mutedColor} weight="regular" />
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
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
