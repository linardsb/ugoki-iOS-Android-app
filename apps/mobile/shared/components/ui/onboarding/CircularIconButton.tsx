import React from 'react';
import { Pressable } from 'react-native';
import { YStack, Text, useTheme } from '@/shared/components/tamagui';
import * as Haptics from 'expo-haptics';

interface CircularIconButtonProps {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
}

export function CircularIconButton({
  icon,
  label,
  selected,
  onPress,
  size = 100,
}: CircularIconButtonProps) {
  const theme = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <YStack alignItems="center" gap="$3">
        <YStack
          width={size}
          height={size}
          borderRadius={size / 2}
          backgroundColor={selected ? '$primary' : '$cardBackground'}
          borderWidth={2}
          borderColor={selected ? '$primary' : '$borderColor'}
          justifyContent="center"
          alignItems="center"
        >
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
                color: selected ? '#FFFFFF' : (theme.color?.val ?? '#1a1a1a'),
                size: size * 0.4,
              })
            : icon}
        </YStack>
        <Text
          fontSize="$4"
          fontWeight={selected ? '600' : '500'}
          color={selected ? '$primary' : '$color'}
        >
          {label}
        </Text>
      </YStack>
    </Pressable>
  );
}
