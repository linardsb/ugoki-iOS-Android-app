/**
 * Quota indicator showing remaining searches for the day.
 * Uses theme tokens for consistent styling.
 */

import React from 'react';
import { XStack, Text, useTheme } from '@/shared/components/tamagui';
import { MagnifyingGlass } from 'phosphor-react-native';
import type { UserSearchQuota } from '../types';

interface QuotaIndicatorProps {
  quota: UserSearchQuota | undefined;
  isLoading?: boolean;
}

export function QuotaIndicator({ quota, isLoading }: QuotaIndicatorProps) {
  const theme = useTheme();

  const loadingBg = theme.backgroundHover.val;
  const loadingColor = theme.colorMuted.val;

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

  // Get status colors from theme
  const getStatusColors = () => {
    if (isEmpty) {
      return {
        bg: theme.errorSubtle?.val || theme.backgroundHover.val,
        text: theme.error?.val || '#dc2626',
      };
    }
    if (isLow) {
      return {
        bg: theme.warningSubtle?.val || theme.backgroundHover.val,
        text: theme.warning?.val || '#ca8a04',
      };
    }
    return {
      bg: theme.successSubtle?.val || theme.backgroundHover.val,
      text: theme.success?.val || '#4A9B7F',
    };
  };

  const statusColors = getStatusColors();

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
