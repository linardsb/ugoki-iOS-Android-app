/**
 * Key benefit badge for research papers.
 * Displays emoji + title + description in a compact format.
 */

import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import type { KeyBenefit } from '../types';

interface BenefitBadgeProps {
  benefit: KeyBenefit;
  compact?: boolean;
}

export function BenefitBadge({ benefit, compact = false }: BenefitBadgeProps) {
  if (compact) {
    return (
      <XStack
        backgroundColor="#f3f4f6"
        borderRadius="$2"
        paddingHorizontal="$2"
        paddingVertical="$1"
        gap="$1"
        alignItems="center"
      >
        <Text fontSize={12}>{benefit.emoji}</Text>
        <Text fontSize={11} fontWeight="500" color="#1f2937" numberOfLines={1}>
          {benefit.title}
        </Text>
      </XStack>
    );
  }

  return (
    <XStack
      backgroundColor="#f9fafb"
      borderRadius="$3"
      padding="$3"
      gap="$2"
      alignItems="flex-start"
    >
      <Text fontSize={20}>{benefit.emoji}</Text>
      <YStack flex={1} gap="$1">
        <Text fontSize={14} fontWeight="600" color="#1f2937">
          {benefit.title}
        </Text>
        <Text fontSize={13} color="#4b5563" lineHeight={18}>
          {benefit.description}
        </Text>
      </YStack>
    </XStack>
  );
}
