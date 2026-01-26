/**
 * Abstract bullet points - bite-sized summary of research abstract.
 * Uses theme tokens for consistent styling.
 */

import React from 'react';
import { View } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';

interface AbstractBulletsProps {
  bullets: string[];
}

export function AbstractBullets({ bullets }: AbstractBulletsProps) {
  const theme = useTheme();

  const cardBackground = theme.backgroundSoft?.val || theme.backgroundHover.val;
  const bulletColor = theme.primary.val;
  const textColor = theme.color.val;
  const borderColor = theme.cardBorder?.val || 'transparent';

  if (!bullets || bullets.length === 0) {
    return null;
  }

  return (
    <YStack
      backgroundColor={cardBackground}
      borderRadius="$3"
      borderWidth={1}
      borderColor={borderColor}
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
