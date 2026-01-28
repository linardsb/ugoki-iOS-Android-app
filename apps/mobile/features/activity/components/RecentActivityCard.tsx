/**
 * Recent Activity Card for Dashboard
 * Shows the 3 most recent activities with a "See All" link
 */

import { View, Text, XStack, YStack, useTheme } from '@/shared/components/tamagui';
import { Card } from '@/shared/components/ui';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CaretRight } from 'phosphor-react-native';
import { useRecentActivity, formatEventTime } from '../hooks/useActivityFeed';
import { CATEGORY_COLORS } from '../types';
import type { ActivityFeedItem } from '../types';
import { navigateToActivity, getActivityNavigation } from './ActivityFeedItem';

// Map backend icon names to Ionicons
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'user-plus': 'person-add',
  'log-in': 'log-in',
  'log-out': 'log-out',
  'clock': 'time',
  'pause': 'pause',
  'play': 'play',
  'check-circle': 'checkmark-circle',
  'x-circle': 'close-circle',
  'plus-circle': 'add-circle',
  'activity': 'fitness',
  'award': 'ribbon',
  'star': 'star',
  'trending-up': 'trending-up',
  'flame': 'flame',
  'refresh-cw': 'refresh',
  'trophy': 'trophy',
  'user': 'person',
  'edit': 'create',
  'target': 'locate',
  'settings': 'settings',
  'scale': 'scale',
  'file-text': 'document-text',
  'bar-chart': 'bar-chart',
  'message-circle': 'chatbubble',
  'lightbulb': 'bulb',
  'bookmark': 'bookmark',
  'bookmark-minus': 'bookmark-outline',
};

function ActivityItem({ item, router }: { item: ActivityFeedItem; router: ReturnType<typeof useRouter> }) {
  const theme = useTheme();
  const mutedIconColor = theme.colorSubtle.val;
  const iconName = ICON_MAP[item.icon] || 'ellipse';
  const categoryColor = CATEGORY_COLORS[item.category];
  const time = formatEventTime(item.timestamp);
  const navDestination = getActivityNavigation(item);
  const isNavigable = navDestination !== null;

  const content = (
    <XStack gap="$3" alignItems="center" paddingVertical="$2">
      <View
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor={categoryColor + '20'}
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={iconName} size={18} color={categoryColor} />
      </View>
      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="600" color="$color" numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text fontSize="$3" color="$colorSubtle" numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </YStack>
      <XStack alignItems="center" gap="$1">
        <Text fontSize="$3" color="$colorSubtle">
          {time}
        </Text>
        {isNavigable && (
          <CaretRight size={12} color={mutedIconColor} weight="bold" />
        )}
      </XStack>
    </XStack>
  );

  if (isNavigable) {
    return (
      <TouchableOpacity
        onPress={() => navigateToActivity(router, item)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export function RecentActivityCard() {
  const router = useRouter();
  const theme = useTheme();
  const mutedIconColor = theme.colorSubtle.val;
  const { data: activities, isLoading } = useRecentActivity(3);

  if (isLoading) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Recent Activity
            </Text>
          </XStack>
          {[1, 2, 3].map((i) => (
            <XStack key={i} gap="$3" alignItems="center" paddingVertical="$2">
              <View width={36} height={36} borderRadius={18} backgroundColor="$backgroundHover" />
              <YStack flex={1} gap="$1">
                <View width="60%" height={14} backgroundColor="$backgroundHover" borderRadius="$2" />
                <View width="40%" height={10} backgroundColor="$backgroundHover" borderRadius="$2" />
              </YStack>
            </XStack>
          ))}
        </YStack>
      </Card>
    );
  }

  if (!activities?.length) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <YStack gap="$3" alignItems="center" paddingVertical="$2">
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="$backgroundHover"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="time-outline" size={24} color={mutedIconColor} />
          </View>
          <Text fontSize="$3" color="$colorSubtle" textAlign="center">
            No activity yet. Start a fast or workout!
          </Text>
        </YStack>
      </Card>
    );
  }

  return (
    <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$1">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Recent Activity
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(modals)/activity')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <XStack alignItems="center" gap="$1">
              <Text fontSize="$3" color="$primary" fontWeight="500">
                See All
              </Text>
              <CaretRight size={14} color="#14b8a6" weight="bold" />
            </XStack>
          </TouchableOpacity>
        </XStack>

        {activities.map((item) => (
          <ActivityItem key={item.id} item={item} router={router} />
        ))}
      </YStack>
    </Card>
  );
}
