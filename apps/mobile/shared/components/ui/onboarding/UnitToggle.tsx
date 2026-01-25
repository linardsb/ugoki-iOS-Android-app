import React from 'react';
import { Pressable } from 'react-native';
import { XStack, Text } from 'tamagui';
import * as Haptics from 'expo-haptics';

interface UnitToggleProps {
  value: 'metric' | 'imperial';
  onChange: (value: 'metric' | 'imperial') => void;
  options: { metric: string; imperial: string };
}

export function UnitToggle({ value, onChange, options }: UnitToggleProps) {
  const handleSelect = (newValue: 'metric' | 'imperial') => {
    if (newValue !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newValue);
    }
  };

  return (
    <XStack
      backgroundColor="$cardBackground"
      borderRadius={999}
      padding="$1"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Pressable style={{ flex: 1 }} onPress={() => handleSelect('metric')}>
        <XStack
          paddingVertical="$3"
          paddingHorizontal="$4"
          borderRadius={999}
          backgroundColor={value === 'metric' ? '$primary' : 'transparent'}
          justifyContent="center"
          alignItems="center"
        >
          <Text
            fontSize="$4"
            fontWeight="600"
            color={value === 'metric' ? 'white' : '$color'}
          >
            {options.metric}
          </Text>
        </XStack>
      </Pressable>
      <Pressable style={{ flex: 1 }} onPress={() => handleSelect('imperial')}>
        <XStack
          paddingVertical="$3"
          paddingHorizontal="$4"
          borderRadius={999}
          backgroundColor={value === 'imperial' ? '$primary' : 'transparent'}
          justifyContent="center"
          alignItems="center"
        >
          <Text
            fontSize="$4"
            fontWeight="600"
            color={value === 'imperial' ? 'white' : '$color'}
          >
            {options.imperial}
          </Text>
        </XStack>
      </Pressable>
    </XStack>
  );
}
