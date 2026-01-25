import { XStack, YStack, Text, useTheme } from 'tamagui';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * ProgressBar - A linear progress indicator component
 *
 * Used for: Workout progress, fasting progress, XP bars, etc.
 */

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'above';
  animated?: boolean;
  variant?: 'default' | 'rounded' | 'striped';
}

export function ProgressBar({
  progress,
  height = 8,
  backgroundColor,
  fillColor,
  showLabel = false,
  labelPosition = 'outside',
  animated = true,
  variant = 'default',
}: ProgressBarProps) {
  const theme = useTheme();
  const progressValue = useSharedValue(0);

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    if (animated) {
      progressValue.value = withSpring(clampedProgress, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const bgColor = backgroundColor || theme.progressBackground?.val || theme.borderColor?.val;
  const fColor = fillColor || theme.progressFill?.val || theme.primary?.val;

  const borderRadius = variant === 'rounded' ? height / 2 : 4;

  const renderLabel = () => {
    if (!showLabel) return null;

    return (
      <Text
        color={labelPosition === 'inside' ? 'white' : '$colorMuted'}
        fontSize="$1"
        fontWeight="600"
      >
        {Math.round(clampedProgress)}%
      </Text>
    );
  };

  if (labelPosition === 'above') {
    return (
      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          {renderLabel()}
        </XStack>
        <View
          style={[
            styles.container,
            {
              height,
              backgroundColor: bgColor,
              borderRadius,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              animatedFillStyle,
              {
                backgroundColor: fColor,
                borderRadius,
              },
            ]}
          />
        </View>
      </YStack>
    );
  }

  return (
    <XStack alignItems="center" gap="$2">
      <View
        style={[
          styles.container,
          {
            height,
            backgroundColor: bgColor,
            borderRadius,
            flex: 1,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            animatedFillStyle,
            {
              backgroundColor: fColor,
              borderRadius,
            },
          ]}
        >
          {labelPosition === 'inside' && showLabel && clampedProgress > 20 && (
            <XStack flex={1} justifyContent="center" alignItems="center">
              {renderLabel()}
            </XStack>
          )}
        </Animated.View>
      </View>
      {labelPosition === 'outside' && renderLabel()}
    </XStack>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default ProgressBar;
