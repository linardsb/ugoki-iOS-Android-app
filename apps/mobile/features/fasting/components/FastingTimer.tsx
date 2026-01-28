import { useEffect, useState } from 'react';
import { YStack, Text, XStack } from '@/shared/components/tamagui';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useFastingStore } from '../stores/fastingStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface FastingTimerProps {
  size?: number;
  strokeWidth?: number;
}

export function FastingTimer({ size = 280, strokeWidth = 12 }: FastingTimerProps) {
  const { activeWindow, isPaused, getProgress, getElapsedMs, getRemainingMs } = useFastingStore();
  const [, forceUpdate] = useState(0);

  // Animation values
  const progress = useSharedValue(0);

  // Circle calculations
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Update timer every second
  useEffect(() => {
    if (!activeWindow || isPaused) return;

    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWindow, isPaused]);

  // Animate progress
  useEffect(() => {
    const { progressPercent } = getProgress();
    progress.value = withTiming(progressPercent / 100, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [getProgress().progressPercent]);

  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  // Format time display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const elapsedMs = getElapsedMs();
  const remainingMs = getRemainingMs();
  const { progressPercent, isComplete } = getProgress();

  // Determine colors based on state
  const getProgressColor = () => {
    if (isComplete) return '#4A9B7F'; // Sage Green
    if (isPaused) return '#FFA387'; // Peach Coral
    if (progressPercent >= 75) return '#4A9B7F'; // Sage Green - almost done
    if (progressPercent >= 50) return '#3A5BA0'; // Slate Blue
    return '#FFA387'; // Peach Coral - primary
  };

  const getStatusText = () => {
    if (!activeWindow) return 'No active fast';
    if (isComplete) return 'Fast complete!';
    if (isPaused) return 'Paused';
    return 'Fasting';
  };

  return (
    <YStack alignItems="center" gap="$4">
      {/* Circular Progress */}
      <YStack width={size} height={size} position="relative">
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#E8E6E2"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={getProgressColor()}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* Center content */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          justifyContent="center"
          alignItems="center"
        >
          {/* Elapsed time (large) */}
          <Text
            fontSize={42}
            fontWeight="bold"
            color="$color"
            fontFamily="$mono"
          >
            {formatTime(elapsedMs)}
          </Text>

          {/* Status */}
          <Text fontSize="$4" color="$colorMuted" marginTop="$1">
            {getStatusText()}
          </Text>

          {/* Remaining time */}
          {remainingMs !== null && !isComplete && (
            <XStack gap="$1" marginTop="$2" alignItems="center">
              <Text fontSize="$3" color="$colorMuted">
                {formatTime(remainingMs)} remaining
              </Text>
            </XStack>
          )}
        </YStack>
      </YStack>

      {/* Progress percentage */}
      <XStack gap="$2" alignItems="center">
        <Text fontSize="$5" fontWeight="600" color={getProgressColor()}>
          {Math.round(progressPercent)}%
        </Text>
        <Text fontSize="$3" color="$colorMuted">
          complete
        </Text>
      </XStack>
    </YStack>
  );
}
