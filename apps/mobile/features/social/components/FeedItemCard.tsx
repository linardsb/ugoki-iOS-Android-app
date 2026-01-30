/**
 * FeedItemCard Component
 * Displays an activity feed item with cheer functionality
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView } from 'react-native';
import { XStack, YStack, Text, useTheme } from '@/shared/components/tamagui';
import { useRouter } from 'expo-router';
import {
  Fire,
  Barbell,
  Trophy,
  Star,
  Lightning,
  Users,
  Heart,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import type { FeedItem, FeedActivityType } from '../types';

interface FeedItemCardProps {
  item: FeedItem;
  onCheer?: (itemId: string, isCheered: boolean) => void;
  isCheerPending?: boolean;
}

// Map activity type to icon component
const getActivityIcon = (type: FeedActivityType, color: string, size: number = 20) => {
  const iconProps = { size, color, weight: 'fill' as const };

  switch (type) {
    case 'fast_completed':
      return <Fire {...iconProps} />;
    case 'workout_completed':
      return <Barbell {...iconProps} />;
    case 'achievement_unlocked':
      return <Trophy {...iconProps} />;
    case 'level_up':
      return <Star {...iconProps} />;
    case 'streak_milestone':
      return <Lightning {...iconProps} />;
    case 'duo_streak_milestone':
      return <Users {...iconProps} />;
    default:
      return <Star {...iconProps} />;
  }
};

// Get semantic colors for activity types
const getActivityColors = (type: FeedActivityType, theme: ReturnType<typeof useTheme>) => {
  switch (type) {
    case 'fast_completed':
      return {
        bg: theme.warningMuted?.val || theme.backgroundHover.val,
        icon: theme.warning?.val || '#E8A838',
      };
    case 'workout_completed':
      return {
        bg: theme.successMuted?.val || theme.backgroundHover.val,
        icon: theme.success?.val || '#4A9B7F',
      };
    case 'achievement_unlocked':
      return {
        bg: theme.primaryMuted?.val || theme.backgroundHover.val,
        icon: theme.primary?.val || '#3A5BA0',
      };
    case 'level_up':
      return {
        bg: theme.primaryMuted?.val || theme.backgroundHover.val,
        icon: theme.primary?.val || '#3A5BA0',
      };
    case 'streak_milestone':
    case 'duo_streak_milestone':
      return {
        bg: theme.warningMuted?.val || theme.backgroundHover.val,
        icon: theme.warning?.val || '#E8A838',
      };
    default:
      return {
        bg: theme.backgroundHover.val,
        icon: theme.colorMuted.val,
      };
  }
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function FeedItemCard({ item, onCheer, isCheerPending }: FeedItemCardProps) {
  const router = useRouter();
  const theme = useTheme();

  const cheerScale = useSharedValue(1);

  const primaryColor = theme.primary?.val || '#3A5BA0';
  const mutedColor = theme.colorMuted.val;
  const heartColor = item.i_cheered
    ? theme.error?.val || '#E85454'
    : mutedColor;

  const activityColors = getActivityColors(item.activity_type as FeedActivityType, theme);
  const name = item.display_name || 'User';
  const initials = name.slice(0, 2).toUpperCase();

  const handleUserPress = useCallback(() => {
    router.push(`/user/${item.identity_id}`);
  }, [router, item.identity_id]);

  const handleCheerPress = useCallback(() => {
    if (isCheerPending) return;

    // Haptic feedback
    Haptics.impactAsync(
      item.i_cheered ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );

    // Bounce animation
    cheerScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 400 })
    );

    onCheer?.(item.id, item.i_cheered);
  }, [item.id, item.i_cheered, isCheerPending, onCheer, cheerScale]);

  const cheerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cheerScale.value }],
  }));

  return (
    <XStack
      backgroundColor="$cardBackground"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$cardBorder"
      padding="$3"
      gap="$3"
    >
      {/* Avatar */}
      <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={[styles.avatar, { backgroundColor: theme.backgroundHover.val }]}
          />
        ) : (
          <RNView style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
            <Text color="white" fontSize="$4" fontWeight="600">
              {initials}
            </Text>
          </RNView>
        )}
      </TouchableOpacity>

      {/* Content */}
      <YStack flex={1} gap="$2">
        {/* Header Row */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$0.5">
            <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
              <Text fontSize="$3" fontWeight="600" color="$color">
                {name}
              </Text>
            </TouchableOpacity>
            <Text fontSize="$2" color="$colorMuted">
              {formatRelativeTime(item.created_at)}
            </Text>
          </YStack>

          {/* Activity Type Badge */}
          <RNView style={[styles.activityBadge, { backgroundColor: activityColors.bg }]}>
            {getActivityIcon(item.activity_type as FeedActivityType, activityColors.icon, 16)}
          </RNView>
        </XStack>

        {/* Activity Content */}
        <YStack gap="$1">
          <Text fontSize="$4" fontWeight="500" color="$color">
            {item.title}
          </Text>
          {item.subtitle && (
            <Text fontSize="$3" color="$colorMuted">
              {item.subtitle}
            </Text>
          )}
        </YStack>

        {/* Cheer Button */}
        <XStack justifyContent="flex-start" paddingTop="$1">
          <AnimatedTouchable
            onPress={handleCheerPress}
            activeOpacity={0.7}
            disabled={isCheerPending}
            style={[styles.cheerButton, cheerAnimatedStyle]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart
              size={20}
              color={heartColor}
              weight={item.i_cheered ? 'fill' : 'regular'}
            />
            <Text
              fontSize="$3"
              color={item.i_cheered ? '$error' : '$colorMuted'}
              fontWeight={item.i_cheered ? '600' : '400'}
              marginLeft={4}
            >
              {item.cheer_count > 0 ? item.cheer_count : 'Cheer'}
            </Text>
          </AnimatedTouchable>
        </XStack>
      </YStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
});
