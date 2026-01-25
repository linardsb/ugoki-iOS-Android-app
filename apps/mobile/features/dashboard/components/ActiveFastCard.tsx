/**
 * ActiveFastCard Component
 * Uses theme tokens for all colors - no hardcoded values.
 */

import { useEffect, useState } from 'react';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { Timer, Play, CaretRight, ForkKnife } from 'phosphor-react-native';
import { Card, ProgressBar } from '@/shared/components/ui';
import { useFastingStore, useHasActiveFast } from '@/features/fasting';

export function ActiveFastCard() {
  const router = useRouter();
  const theme = useTheme();
  const { activeWindow, isPaused, getProgress, getElapsedMs, getRemainingMs } = useFastingStore();
  const hasActiveFast = useHasActiveFast();
  const [, forceUpdate] = useState(0);

  // Theme colors
  const primaryColor = theme.primary.val;
  const successColor = theme.success.val;
  const secondaryColor = theme.secondary.val;

  // Update timer every second if active
  useEffect(() => {
    if (!hasActiveFast || isPaused) return;

    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActiveFast, isPaused]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    router.push('/(tabs)/fasting');
  };

  // No active fast - show CTA
  if (!hasActiveFast) {
    return (
      <Card
        backgroundColor="$primary"
        padding="$4"
        borderRadius="$4"
        pressStyle={{ opacity: 0.9 }}
        onPress={handlePress}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$3" alignItems="center">
            <XStack
              width={48}
              height={48}
              borderRadius="$6"
              backgroundColor="rgba(255,255,255,0.2)"
              justifyContent="center"
              alignItems="center"
            >
              <Play size={24} color="white" weight="thin" />
            </XStack>
            <YStack>
              <Text fontSize="$5" fontWeight="bold" color="white">
                Start Your Fast
              </Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">
                Tap to begin fasting
              </Text>
            </YStack>
          </XStack>
          <CaretRight size={24} color="white" weight="thin" />
        </XStack>
      </Card>
    );
  }

  // Active fast - show progress
  const { progressPercent, isComplete } = getProgress();
  const elapsedMs = getElapsedMs();
  const remainingMs = getRemainingMs();
  const showBreakFastCTA = progressPercent >= 80 || isComplete;

  // Determine card color based on state
  const cardBgColor = isComplete ? '$success' : isPaused ? '$secondary' : '$primary';

  return (
    <Card
      backgroundColor={cardBgColor}
      padding="$4"
      borderRadius="$4"
      pressStyle={{ opacity: 0.9 }}
      onPress={handlePress}
    >
      <YStack gap="$3">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Timer size={20} color="white" weight="thin" />
            <Text fontSize="$2" color="rgba(255,255,255,0.8)">
              {isComplete ? 'Fast Complete!' : isPaused ? 'Fast Paused' : 'Fasting Now'}
            </Text>
          </XStack>
          <Text fontSize="$2" fontWeight="bold" color="white">
            {Math.round(progressPercent)}%
          </Text>
        </XStack>

        {/* Timer */}
        <XStack justifyContent="space-between" alignItems="baseline">
          <Text fontSize="$8" fontWeight="bold" color="white" fontFamily="$mono">
            {formatTime(elapsedMs)}
          </Text>
          {remainingMs !== null && !isComplete && (
            <Text fontSize="$2" color="rgba(255,255,255,0.8)">
              {formatTime(remainingMs)} left
            </Text>
          )}
        </XStack>

        {/* Progress bar */}
        <YStack height={4} backgroundColor="rgba(255,255,255,0.3)" borderRadius="$2">
          <YStack
            height={4}
            backgroundColor="white"
            borderRadius="$2"
            width={`${Math.min(100, progressPercent)}%`}
          />
        </YStack>

        {/* Break Fast Guide CTA */}
        {showBreakFastCTA && (
          <XStack
            backgroundColor="rgba(255,255,255,0.2)"
            padding="$2"
            paddingHorizontal="$3"
            borderRadius="$3"
            alignItems="center"
            justifyContent="space-between"
            pressStyle={{ opacity: 0.8 }}
            onPress={(e) => {
              e.stopPropagation();
              router.push('/(modals)/break-fast-guide');
            }}
          >
            <XStack gap="$2" alignItems="center">
              <ForkKnife size={16} color="white" weight="thin" />
              <Text fontSize="$2" color="white" fontWeight="500">
                How to break your fast safely
              </Text>
            </XStack>
            <CaretRight size={16} color="white" weight="thin" />
          </XStack>
        )}
      </YStack>
    </Card>
  );
}
