import { useEffect } from 'react';
import { XStack, YStack } from 'tamagui';
import { Robot } from 'phosphor-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const AnimatedYStack = Animated.createAnimatedComponent(YStack);

export function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      false
    );
    dot2.value = withDelay(
      100,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
    dot3.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <XStack
      width="100%"
      justifyContent="flex-start"
      paddingHorizontal="$4"
      paddingVertical="$1"
    >
      <XStack gap="$2" alignItems="flex-end">
        {/* Avatar */}
        <XStack
          width={32}
          height={32}
          borderRadius="$6"
          backgroundColor="$secondary"
          justifyContent="center"
          alignItems="center"
        >
          <Robot size={16} color="white" weight="thin" />
        </XStack>

        {/* Typing indicator */}
        <XStack
          backgroundColor="$cardBackground"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderRadius="$4"
          borderBottomLeftRadius="$1"
          gap="$2"
          alignItems="center"
        >
          <AnimatedYStack
            width={8}
            height={8}
            borderRadius="$6"
            backgroundColor="$colorMuted"
            style={dot1Style}
          />
          <AnimatedYStack
            width={8}
            height={8}
            borderRadius="$6"
            backgroundColor="$colorMuted"
            style={dot2Style}
          />
          <AnimatedYStack
            width={8}
            height={8}
            borderRadius="$6"
            backgroundColor="$colorMuted"
            style={dot3Style}
          />
        </XStack>
      </XStack>
    </XStack>
  );
}
