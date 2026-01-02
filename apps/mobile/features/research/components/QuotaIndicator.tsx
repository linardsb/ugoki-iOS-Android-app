/**
 * Quota indicator showing remaining searches for the day.
 */

import React from 'react';
import { useColorScheme } from 'react-native';
import { XStack, Text } from 'tamagui';
import { useThemeStore } from '@/shared/stores/theme';
import { MagnifyingGlass } from 'phosphor-react-native';
import type { UserSearchQuota } from '../types';
import { getTextColor as getThemeTextColor, getStatusColors, getBackground } from '../colors';

interface QuotaIndicatorProps {
  quota: UserSearchQuota | undefined;
  isLoading?: boolean;
}

export function QuotaIndicator({ quota, isLoading }: QuotaIndicatorProps) {
  // Theme - compute effective theme same as root layout
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';
  const loadingBg = getBackground(isDark, 'cardAlt');
  const loadingColor = getThemeTextColor(isDark, 'subtle');

  if (isLoading || !quota) {
    return (
      <XStack
        backgroundColor={loadingBg}
        borderRadius="$4"
        paddingHorizontal="$3"
        paddingVertical="$2"
        gap="$2"
        alignItems="center"
      >
        <MagnifyingGlass size={14} color={loadingColor} />
        <Text fontSize={12} style={{ color: loadingColor }}>
          Loading...
        </Text>
      </XStack>
    );
  }

  const remaining = quota.searches_remaining;
  const total = quota.limit;
  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  // Use global status colors for consistency
  const getStatusType = (): 'error' | 'warning' | 'success' => {
    if (isEmpty) return 'error';
    if (isLow) return 'warning';
    return 'success';
  };

  const statusColors = getStatusColors(isDark, getStatusType());

  return (
    <XStack
      backgroundColor={statusColors.bg}
      borderRadius="$4"
      paddingHorizontal="$3"
      paddingVertical="$2"
      gap="$2"
      alignItems="center"
    >
      <MagnifyingGlass
        size={14}
        color={statusColors.text}
      />
      <Text
        fontSize={12}
        fontWeight="500"
        style={{ color: statusColors.text }}
      >
        {remaining}/{total} searches today
      </Text>
    </XStack>
  );
}
