/**
 * Activity Feed Item component
 * Displays a single activity event with icon, title, description, and time
 */

import { View, Text, XStack, YStack } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityFeedItem as ActivityFeedItemType, EventCategory } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';
import { formatEventTime } from '../hooks/useActivityFeed';

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

interface ActivityFeedItemProps {
  item: ActivityFeedItemType;
  onPress?: () => void;
  showCategory?: boolean;
}

export function ActivityFeedItem({ item, onPress, showCategory = false }: ActivityFeedItemProps) {
  const iconName = ICON_MAP[item.icon] || 'ellipse';
  const categoryColor = CATEGORY_COLORS[item.category];
  const time = formatEventTime(item.timestamp);

  const content = (
    <XStack
      backgroundColor="$backgroundStrong"
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
      gap="$3"
      alignItems="center"
    >
      {/* Icon Container */}
      <View
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor={categoryColor + '20'}
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={iconName} size={22} color={categoryColor} />
      </View>

      {/* Content */}
      <YStack flex={1}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize="$4"
            fontWeight="600"
            color="$color"
            numberOfLines={1}
            flex={1}
          >
            {item.title}
          </Text>
          <Text fontSize="$2" color="$colorSubtle" marginLeft="$2">
            {time}
          </Text>
        </XStack>

        {item.description && (
          <Text
            fontSize="$3"
            color="$colorSubtle"
            numberOfLines={1}
            marginTop="$1"
          >
            {item.description}
          </Text>
        )}

        {showCategory && (
          <XStack marginTop="$1" alignItems="center" gap="$1">
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={categoryColor}
            />
            <Text fontSize="$2" color="$colorSubtle">
              {CATEGORY_LABELS[item.category]}
            </Text>
          </XStack>
        )}
      </YStack>
    </XStack>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// Section header for date groups
interface SectionHeaderProps {
  title: string;
}

export function ActivitySectionHeader({ title }: SectionHeaderProps) {
  return (
    <View paddingVertical="$2" paddingHorizontal="$1" marginTop="$2">
      <Text fontSize="$3" fontWeight="600" color="$colorSubtle">
        {title}
      </Text>
    </View>
  );
}

// Empty state
export function ActivityEmptyState() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <View
        width={80}
        height={80}
        borderRadius={40}
        backgroundColor="$backgroundHover"
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name="time-outline" size={40} color="#9ca3af" />
      </View>
      <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
        No Activity Yet
      </Text>
      <Text fontSize="$3" color="$colorSubtle" textAlign="center">
        Your activity will appear here as you use the app
      </Text>
    </YStack>
  );
}

// Loading skeleton
export function ActivityItemSkeleton() {
  return (
    <XStack
      backgroundColor="$backgroundStrong"
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
      gap="$3"
      alignItems="center"
    >
      <View
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor="$backgroundHover"
      />
      <YStack flex={1} gap="$2">
        <View
          width="60%"
          height={16}
          borderRadius="$2"
          backgroundColor="$backgroundHover"
        />
        <View
          width="40%"
          height={12}
          borderRadius="$2"
          backgroundColor="$backgroundHover"
        />
      </YStack>
    </XStack>
  );
}
