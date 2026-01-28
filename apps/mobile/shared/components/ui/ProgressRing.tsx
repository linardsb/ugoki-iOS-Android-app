import { YStack, useTheme } from '@/shared/components/tamagui';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 200,
  strokeWidth = 12,
  color,
  backgroundColor,
  children,
  animated = true,
}: ProgressRingProps) {
  const theme = useTheme();
  const progressValue = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

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

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (progressValue.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  // Use theme tokens with fallback
  const strokeColor = color || theme.progressFill?.val || theme.primary?.val;
  const bgColor = backgroundColor || theme.progressBackground?.val || theme.borderColor?.val;

  return (
    <YStack width={size} height={size} alignItems="center" justifyContent="center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Center content */}
      <YStack alignItems="center" justifyContent="center">
        {children}
      </YStack>
    </YStack>
  );
}
