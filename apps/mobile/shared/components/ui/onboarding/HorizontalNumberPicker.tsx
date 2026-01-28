import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from 'react-native';
import { YStack, XStack, Text } from '@/shared/components/tamagui';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = 50;

interface HorizontalNumberPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  compact?: boolean;
}

export function HorizontalNumberPicker({
  min,
  max,
  value,
  onChange,
  unit,
  step = 1,
  compact = false,
}: HorizontalNumberPickerProps) {
  const flatListRef = useRef<FlatList>(null);
  const lastValue = useRef(value);
  const hasScrolledRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Generate array of numbers
  const numbers = useMemo(() => {
    const arr: number[] = [];
    for (let i = min; i <= max; i += step) {
      arr.push(i);
    }
    return arr;
  }, [min, max, step]);

  // Calculate side padding based on actual container width
  const sidePadding = containerWidth ? (containerWidth - ITEM_WIDTH) / 2 : 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      hasScrolledRef.current = false; // Reset scroll flag when width changes
    }
  }, [containerWidth]);

  // Scroll to value after container width is measured
  useEffect(() => {
    if (containerWidth === null || hasScrolledRef.current) return;

    const index = numbers.indexOf(value);
    if (index !== -1 && flatListRef.current) {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: index * ITEM_WIDTH,
            animated: false,
          });
          hasScrolledRef.current = true;
        }, 50);
      });
    }
  }, [containerWidth, numbers, value]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / ITEM_WIDTH);
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
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => {
      const isSelected = item === value;
      return (
        <YStack
          width={ITEM_WIDTH}
          height={compact ? 50 : 60}
          justifyContent="center"
          alignItems="center"
        >
          <Text
            fontSize={isSelected ? (compact ? 20 : 24) : (compact ? 14 : 16)}
            fontWeight={isSelected ? '700' : '400'}
            color={isSelected ? '$color' : '$colorMuted'}
            opacity={isSelected ? 1 : 0.4}
          >
            {item}
          </Text>
        </YStack>
      );
    },
    [value, compact]
  );

  if (compact) {
    // Compact mode: just the picker, no value display
    return (
      <YStack height={60} position="relative" width="100%" onLayout={handleLayout}>
        {/* Selection indicator */}
        <YStack
          position="absolute"
          left="50%"
          top={5}
          bottom={5}
          width={ITEM_WIDTH}
          marginLeft={-ITEM_WIDTH / 2}
          backgroundColor="$cardBackground"
          borderRadius="$3"
          zIndex={0}
        />

        {containerWidth !== null && (
          <FlatList
            ref={flatListRef}
            data={numbers}
            renderItem={renderItem}
            keyExtractor={(item) => item.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: sidePadding,
            }}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
          />
        )}
      </YStack>
    );
  }

  return (
    <YStack alignItems="center" gap="$2" onLayout={handleLayout}>
      {/* Value and unit display */}
      <XStack alignItems="baseline" gap="$2">
        <Text fontSize={36} fontWeight="700" color="$primary">
          {value}
        </Text>
        <Text fontSize="$4" color="$colorMuted" fontWeight="500">
          {unit}
        </Text>
      </XStack>

      {/* Picker */}
      <YStack height={70} position="relative" width="100%">
        {/* Selection indicator */}
        <YStack
          position="absolute"
          left="50%"
          top={5}
          bottom={5}
          width={ITEM_WIDTH}
          marginLeft={-ITEM_WIDTH / 2}
          backgroundColor="$cardBackground"
          borderRadius="$3"
          zIndex={0}
        />

        {containerWidth !== null && (
          <FlatList
            ref={flatListRef}
            data={numbers}
            renderItem={renderItem}
            keyExtractor={(item) => item.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: sidePadding,
            }}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
          />
        )}
      </YStack>
    </YStack>
  );
}
