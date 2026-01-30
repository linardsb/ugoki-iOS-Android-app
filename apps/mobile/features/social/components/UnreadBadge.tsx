/**
 * UnreadBadge Component
 * Displays unread message count badge
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@/shared/components/tamagui';

interface UnreadBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export function UnreadBadge({ count, size = 'medium' }: UnreadBadgeProps) {
  const theme = useTheme();

  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  const sizeStyles = {
    small: { minWidth: 16, height: 16, fontSize: 10 },
    medium: { minWidth: 20, height: 20, fontSize: 12 },
    large: { minWidth: 24, height: 24, fontSize: 14 },
  };

  const { minWidth, height, fontSize } = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          minWidth,
          height,
          backgroundColor: theme.error?.val || '#E85454',
        },
      ]}
    >
      <Text
        color="white"
        fontSize={fontSize}
        fontWeight="600"
        textAlign="center"
      >
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
