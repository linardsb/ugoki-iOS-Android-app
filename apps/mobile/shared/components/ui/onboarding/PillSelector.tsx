import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from '@/shared/components/tamagui';
import { Check } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface PillOption<T> {
  id: T;
  label: string;
  description?: string;
}

interface PillSelectorProps<T> {
  options: PillOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function PillSelector<T extends string | number>({
  options,
  value,
  onChange,
}: PillSelectorProps<T>) {
  const handleSelect = (id: T) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(id);
  };

  return (
    <YStack gap="$3">
      {options.map((option) => {
        const isSelected = value === option.id;

        return (
          <Pressable key={String(option.id)} onPress={() => handleSelect(option.id)}>
            <XStack
              backgroundColor={isSelected ? '$primary' : '$cardBackground'}
              borderRadius={999}
              paddingVertical="$4"
              paddingHorizontal="$5"
              borderWidth={2}
              borderColor={isSelected ? '$primary' : '$borderColor'}
              alignItems="center"
              justifyContent="space-between"
            >
              <YStack flex={1} gap="$1">
                <Text
                  fontSize="$5"
                  fontWeight="600"
                  color={isSelected ? 'white' : '$color'}
                >
                  {option.label}
                </Text>
                {option.description && (
                  <Text
                    fontSize="$3"
                    color={isSelected ? 'rgba(255,255,255,0.8)' : '$colorMuted'}
                  >
                    {option.description}
                  </Text>
                )}
              </YStack>

              {/* Selection indicator */}
              <YStack
                width={24}
                height={24}
                borderRadius={12}
                borderWidth={2}
                borderColor={isSelected ? 'white' : '$borderColor'}
                backgroundColor={isSelected ? 'white' : 'transparent'}
                justifyContent="center"
                alignItems="center"
                marginLeft="$3"
              >
                {isSelected && <Check size={14} color="#3A5BA0" weight="bold" />}
              </YStack>
            </XStack>
          </Pressable>
        );
      })}
    </YStack>
  );
}
