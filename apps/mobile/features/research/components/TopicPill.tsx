/**
 * Topic selection pill/button for Research Hub.
 * Uses theme tokens for consistent styling.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { XStack, Text, useTheme } from '@/shared/components/tamagui';
import {
  ForkKnife,
  Lightning,
  Carrot,
  Moon,
  MagnifyingGlass,
} from 'phosphor-react-native';
import type { ResearchTopic } from '../types';
import { TOPIC_METADATA } from '../types';

interface TopicPillProps {
  topic: ResearchTopic | 'all';
  isSelected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
}

const TOPIC_ICONS: Record<ResearchTopic | 'all', React.ComponentType<any>> = {
  all: MagnifyingGlass,
  intermittent_fasting: ForkKnife,
  hiit: Lightning,
  nutrition: Carrot,
  sleep: Moon,
};

export function TopicPill({
  topic,
  isSelected,
  onPress,
  size = 'md',
}: TopicPillProps) {
  const theme = useTheme();

  // Theme colors from tokens
  const pillBackground = theme.backgroundHover.val;
  const pillBorder = theme.borderColor.val;
  const unselectedTextColor = theme.color.val;

  const Icon = TOPIC_ICONS[topic];
  const metadata = topic === 'all' ? null : TOPIC_METADATA[topic];
  const label = topic === 'all' ? 'All' : metadata?.label || topic;
  const topicColor = topic === 'all' ? theme.colorMuted.val : metadata?.color || theme.colorMuted.val;

  const isSmall = size === 'sm';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.pill,
        isSmall ? styles.pillSmall : styles.pillMedium,
        isSelected
          ? { backgroundColor: topicColor, borderColor: topicColor }
          : { backgroundColor: pillBackground, borderColor: pillBorder },
      ]}
    >
      <XStack alignItems="center" gap={isSmall ? 4 : 6}>
        <Icon
          size={isSmall ? 14 : 18}
          color={isSelected ? '#ffffff' : topicColor}
          weight={isSelected ? 'fill' : 'regular'}
        />
        <Text
          fontSize={isSmall ? 12 : 14}
          fontWeight={isSelected ? '600' : '500'}
          style={{ color: isSelected ? '#ffffff' : unselectedTextColor }}
        >
          {label}
        </Text>
      </XStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillMedium: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
