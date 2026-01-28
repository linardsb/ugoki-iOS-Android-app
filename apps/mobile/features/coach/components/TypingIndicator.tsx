import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { XStack, YStack, Text } from '@/shared/components/tamagui';
import { Robot } from 'phosphor-react-native';
import type { Gender } from '@/features/profile';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const AnimatedYStack = Animated.createAnimatedComponent(YStack);

// Coach avatar images
const coachMaleAvatar = require('../../../assets/coach-male.webp');
const coachFemaleAvatar = require('../../../assets/coach-female.webp');

interface TypingIndicatorProps {
  userGender?: Gender | null;
}

export function TypingIndicator({ userGender }: TypingIndicatorProps) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 400 }),
        withTiming(0, { duration: 400 })
      ),
      -1,
      false
    );
    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      )
    );
    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 400 }),
          withTiming(0, { duration: 400 })
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

  // Get coach avatar based on user's gender preference
  const renderCoachAvatar = () => {
    switch (userGender) {
      case 'male':
        return (
          <Image
            source={coachMaleAvatar}
            style={styles.coachAvatarImage}
          />
        );
      case 'female':
        return (
          <Image
            source={coachFemaleAvatar}
            style={styles.coachAvatarImage}
          />
        );
      default:
        return <Robot size={20} color="white" weight="fill" />;
    }
  };

  const hasCustomAvatar = userGender === 'male' || userGender === 'female';

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
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor={hasCustomAvatar ? 'transparent' : '$secondary'}
          justifyContent="center"
          alignItems="center"
          overflow="hidden"
        >
          {renderCoachAvatar()}
        </XStack>

        {/* Thinking bubble */}
        <YStack
          backgroundColor="$cardBackground"
          paddingHorizontal="$3"
          paddingVertical="$2.5"
          borderRadius="$4"
          borderBottomLeftRadius="$1"
          borderWidth={1}
          borderColor="$cardBorder"
          gap="$1.5"
        >
          <Text fontSize="$2" color="$colorMuted" fontStyle="italic">
            Thinking...
          </Text>
          <XStack gap="$1.5" alignItems="center" justifyContent="center">
            <AnimatedYStack
              width={6}
              height={6}
              borderRadius={3}
              backgroundColor="$colorMuted"
              style={dot1Style}
            />
            <AnimatedYStack
              width={6}
              height={6}
              borderRadius={3}
              backgroundColor="$colorMuted"
              style={dot2Style}
            />
            <AnimatedYStack
              width={6}
              height={6}
              borderRadius={3}
              backgroundColor="$colorMuted"
              style={dot3Style}
            />
          </XStack>
        </YStack>
      </XStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  coachAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
