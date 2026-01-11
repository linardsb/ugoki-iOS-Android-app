/**
 * Abstract bullet points - bite-sized summary of research abstract.
 */

import React from 'react';
import { View, useColorScheme } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useThemeStore } from '@/shared/stores/theme';

interface AbstractBulletsProps {
  bullets: string[];
}

export function AbstractBullets({ bullets }: AbstractBulletsProps) {
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';

  const cardBackground = isDark ? '#1c1c1e' : '#f9fafb';
  const bulletColor = '#14b8a6';
  const textColor = isDark ? '#f5f5f5' : '#374151';

  if (!bullets || bullets.length === 0) {
    return null;
  }

  return (
    <YStack
      backgroundColor={cardBackground}
      borderRadius="$3"
      padding="$3"
      gap="$2"
    >
      {bullets.map((bullet, index) => (
        <XStack key={index} gap="$2" alignItems="flex-start">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bulletColor, marginTop: 7 }} />
          <Text
            flex={1}
            fontSize={14}
            lineHeight={20}
            style={{ color: textColor }}
          >
            {bullet}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
