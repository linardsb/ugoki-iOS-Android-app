/**
 * Key benefit badge for research papers.
 * Displays icon + title + description in a compact format.
 */

import React from 'react';
import { View, useColorScheme } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { useThemeStore } from '@/shared/stores/theme';
import {
  ShieldCheck,
  Wrench,
  Timer,
  Lightbulb,
  TrendUp,
  Heart,
} from 'phosphor-react-native';
import type { KeyBenefit } from '../types';

// Map emoji/title keywords to Phosphor icons
function getBenefitIcon(benefit: KeyBenefit) {
  const title = benefit.title.toLowerCase();
  const emoji = benefit.emoji;

  // Check emoji or title for icon selection
  if (emoji === '🔥' || title.includes('evidence') || title.includes('research')) {
    return <ShieldCheck size={20} color="#14b8a6" weight="fill" />;
  }
  if (emoji === '💪' || title.includes('practical') || title.includes('application')) {
    return <Wrench size={20} color="#f97316" weight="fill" />;
  }
  if (emoji === '⏰' || title.includes('time') || title.includes('efficient')) {
    return <Timer size={20} color="#8b5cf6" weight="fill" />;
  }
  if (title.includes('health') || title.includes('benefit')) {
    return <Heart size={20} color="#ef4444" weight="fill" />;
  }
  if (title.includes('improve') || title.includes('boost')) {
    return <TrendUp size={20} color="#22c55e" weight="fill" />;
  }
  // Default icon
  return <Lightbulb size={20} color="#eab308" weight="fill" />;
}

interface BenefitBadgeProps {
  benefit: KeyBenefit;
  compact?: boolean;
}

export function BenefitBadge({ benefit, compact = false }: BenefitBadgeProps) {
  // Theme - compute effective theme same as root layout
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';

  // Theme-aware colors matching dashboard cards
  const cardBackground = isDark ? '#1c1c1e' : '#f9fafb';
  const iconBackground = isDark ? '#2c2c2e' : '#f3f4f6';
  const titleColor = isDark ? '#ffffff' : '#1f2937';
  const bodyColor = isDark ? '#a1a1aa' : '#4b5563';

  const icon = getBenefitIcon(benefit);

  if (compact) {
    return (
      <XStack
        backgroundColor={iconBackground}
        borderRadius="$2"
        paddingHorizontal="$2"
        paddingVertical="$1"
        gap="$1"
        alignItems="center"
      >
        <View style={{ width: 14, height: 14 }}>
          {React.cloneElement(icon, { size: 14 })}
        </View>
        <Text fontSize={11} fontWeight="500" numberOfLines={1} style={{ color: titleColor }}>
          {benefit.title}
        </Text>
      </XStack>
    );
  }

  return (
    <XStack
      backgroundColor={cardBackground}
      borderRadius="$3"
      padding="$3"
      gap="$3"
      alignItems="flex-start"
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: iconBackground,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <YStack flex={1} gap="$1">
        <Text fontSize={14} fontWeight="600" style={{ color: titleColor }}>
          {benefit.title}
        </Text>
        <Text fontSize={13} lineHeight={18} style={{ color: bodyColor }}>
          {benefit.description}
        </Text>
      </YStack>
    </XStack>
  );
}
