import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 32;
const PICKER_HEIGHT = 200;

interface VerticalRulerPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
}

export function VerticalRulerPicker({
  min,
  max,
  value,
  onChange,
  unit,
  step = 1,
}: VerticalRulerPickerProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const lastValue = useRef(value);

  // Generate array of numbers (reversed for natural scrolling - larger at top)
  const numbers = useMemo(() => {
    const arr: number[] = [];
    for (let i = max; i >= min; i -= step) {
      arr.push(i);
    }
    return arr;
  }, [min, max, step]);

  // Calculate padding to center items
  const verticalPadding = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  // Scroll to initial value on mount
  useEffect(() => {
    const index = numbers.indexOf(value);
    if (index !== -1 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: index * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, numbers.length - 1));
      const newValue = numbers[clampedIndex];

      if (newValue !== lastValue.current) {
        lastValue.current = newValue;
        Haptics.selectionAsync();
        onChange(newValue);
      }
    },
    [numbers, onChange]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => {
      const isSelected = item === value;
      const isMajorTick = item % 10 === 0;

      return (
        <XStack
          height={ITEM_HEIGHT}
          alignItems="center"
          justifyContent="flex-end"
          paddingRight="$3"
        >
          {/* Value label for major ticks */}
          {isMajorTick && (
            <Text
              fontSize={isSelected ? 16 : 12}
              fontWeight={isSelected ? '600' : '400'}
              color={isSelected ? '$color' : '$colorMuted'}
              opacity={isSelected ? 1 : 0.6}
              marginRight="$2"
            >
              {item}
            </Text>
          )}
          {/* Tick mark */}
          <XStack
            height={2}
            width={isMajorTick ? 30 : 15}
            backgroundColor={isSelected ? '$primary' : '$borderColor'}
            borderRadius={1}
          />
        </XStack>
      );
    },
    [value]
  );

  return (
    <XStack gap="$4" alignItems="center">
      {/* Value display */}
      <YStack alignItems="center" minWidth={80}>
        <Text fontSize={48} fontWeight="700" color="$primary">
          {value}
        </Text>
        <Text fontSize="$3" color="$colorMuted" fontWeight="500">
          {unit}
        </Text>
      </YStack>

      {/* Ruler picker */}
      <YStack flex={1} height={PICKER_HEIGHT} position="relative">
        {/* Selection indicator line */}
        <XStack
          position="absolute"
          left={0}
          right={0}
          top={verticalPadding}
          height={ITEM_HEIGHT}
          backgroundColor="$primary"
          opacity={0.1}
          borderRadius="$2"
          zIndex={0}
        />

        {/* Arrow indicator */}
        <YStack
          position="absolute"
          left={0}
          top={verticalPadding + (ITEM_HEIGHT - 20) / 2}
          zIndex={1}
        >
          <CaretRight size={20} color={theme.primary?.val ?? '#3A5BA0'} weight="bold" />
        </YStack>

        <FlatList
          ref={flatListRef}
          data={numbers}
          renderItem={renderItem}
          keyExtractor={(item) => item.toString()}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingVertical: verticalPadding,
          }}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
        />
      </YStack>
    </XStack>
  );
}
