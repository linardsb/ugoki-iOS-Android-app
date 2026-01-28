/**
 * Tamagui Re-exports with Custom Defaults
 *
 * Import from this file instead of 'tamagui' to get:
 * - Text component with app font family applied by default
 * - All other Tamagui components unchanged
 *
 * Usage:
 *   import { Text, YStack, XStack } from '@/shared/components/tamagui';
 */

import { styled, Text as TamaguiText } from 'tamagui';

// Re-export everything from tamagui
export * from 'tamagui';

// Override Text with our styled version that has font family and letter spacing applied
export const Text = styled(TamaguiText, {
  name: 'Text',
  fontFamily: '$body',
  letterSpacing: 0.8,
});
