/**
 * Quota indicator showing remaining searches for the day.
 */

import React from 'react';
import { XStack, Text } from 'tamagui';
import { MagnifyingGlass } from 'phosphor-react-native';
import type { UserSearchQuota } from '../types';

interface QuotaIndicatorProps {
  quota: UserSearchQuota | undefined;
  isLoading?: boolean;
}

export function QuotaIndicator({ quota, isLoading }: QuotaIndicatorProps) {
  if (isLoading || !quota) {
    return (
      <XStack
        backgroundColor="#f3f4f6"
        borderRadius="$4"
        paddingHorizontal="$3"
        paddingVertical="$2"
        gap="$2"
        alignItems="center"
      >
        <MagnifyingGlass size={14} color="#9ca3af" />
        <Text fontSize={12} color="#9ca3af">
          Loading...
        </Text>
      </XStack>
    );
  }

  const remaining = quota.searches_remaining;
  const total = quota.limit;
  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  return (
    <XStack
      backgroundColor={isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4'}
      borderRadius="$4"
      paddingHorizontal="$3"
      paddingVertical="$2"
      gap="$2"
      alignItems="center"
    >
      <MagnifyingGlass
        size={14}
        color={isEmpty ? '#dc2626' : isLow ? '#d97706' : '#16a34a'}
      />
      <Text
        fontSize={12}
        fontWeight="500"
        color={isEmpty ? '#dc2626' : isLow ? '#d97706' : '#16a34a'}
      >
        {remaining}/{total} searches today
      </Text>
    </XStack>
  );
}
