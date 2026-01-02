/**
 * Quota indicator showing remaining searches for the day.
 */

import React from 'react';
import { XStack, Text, useTheme } from 'tamagui';
import { MagnifyingGlass } from 'phosphor-react-native';
import type { UserSearchQuota } from '../types';

interface QuotaIndicatorProps {
  quota: UserSearchQuota | undefined;
  isLoading?: boolean;
}

export function QuotaIndicator({ quota, isLoading }: QuotaIndicatorProps) {
  const theme = useTheme();
  const isDark = theme.name === 'dark';
  const loadingBg = isDark ? '#2c2c2e' : '#f3f4f6';
  const loadingColor = isDark ? '#71717a' : '#9ca3af';

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
        <Text fontSize={12} color={loadingColor}>
          Loading...
        </Text>
      </XStack>
    );
  }

  const remaining = quota.searches_remaining;
  const total = quota.limit;
  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  // Dark mode aware status colors
  const getBgColor = () => {
    if (isEmpty) return isDark ? '#3f1f1f' : '#fef2f2';
    if (isLow) return isDark ? '#3f2f1f' : '#fffbeb';
    return isDark ? '#1f3f2f' : '#f0fdf4';
  };

  const getTextColor = () => {
    if (isEmpty) return isDark ? '#fca5a5' : '#dc2626';
    if (isLow) return isDark ? '#fcd34d' : '#d97706';
    return isDark ? '#86efac' : '#16a34a';
  };

  return (
    <XStack
      backgroundColor={getBgColor()}
      borderRadius="$4"
      paddingHorizontal="$3"
      paddingVertical="$2"
      gap="$2"
      alignItems="center"
    >
      <MagnifyingGlass
        size={14}
        color={getTextColor()}
      />
      <Text
        fontSize={12}
        fontWeight="500"
        color={getTextColor()}
      >
        {remaining}/{total} searches today
      </Text>
    </XStack>
  );
}
