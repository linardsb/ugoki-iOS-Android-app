import { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Timer, Lightning, Sparkle } from 'phosphor-react-native';

import { useCreateAnonymous } from '@/features/auth';

// Import logo image
const logoImage = require('../../assets/splash.png');

// Feature badge component
function FeatureBadge({
  icon: Icon,
  text,
  delay
}: {
  icon: typeof Timer;
  text: string;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateX.value = withDelay(delay, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <XStack gap="$3" alignItems="center">
        <Icon size={24} color="#52525b" weight="regular" />
        <Text fontSize="$4" color="#18181b" fontWeight="500">
          {text}
        </Text>
      </XStack>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo animation
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    // Tagline fade in after logo
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  // Create anonymous identity using the auth hook
  const createAnonymous = useCreateAnonymous({
    onSuccess: () => {
      router.replace('/(auth)/onboarding');
    },
    onError: (errorMessage) => {
      setError(errorMessage);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    },
  });

  const handleGetStarted = () => {
    createAnonymous.mutate();
  };

  return (
    <LinearGradient
      colors={['#fff7ed', '#ffffff', '#f0fdfa']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} padding="$6" justifyContent="space-between">
          {/* Logo and tagline */}
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$6">
            {/* Animated Logo */}
            <Animated.View style={logoAnimatedStyle}>
              <Image
                source={logoImage}
                style={{ width: 280, height: 120 }}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Tagline */}
            <Animated.View style={taglineAnimatedStyle}>
              <Text
                fontSize="$5"
                color="#71717a"
                textAlign="center"
                maxWidth={280}
              >
                Intermittent Fasting meets HIIT Training
              </Text>
            </Animated.View>

            {/* Feature badges with staggered animation */}
            <YStack gap="$4" marginTop="$4" alignItems="flex-start">
              <FeatureBadge
                icon={Timer}
                text="Personalized fasting protocols"
                delay={600}
              />
              <FeatureBadge
                icon={Lightning}
                text="15-minute HIIT workouts"
                delay={750}
              />
              <FeatureBadge
                icon={Sparkle}
                text="AI-powered coaching"
                delay={900}
              />
            </YStack>
          </YStack>

          {/* CTA Buttons */}
          <YStack gap="$3" paddingBottom="$4">
            <Button
              size="$6"
              height={56}
              backgroundColor="$primary"
              borderRadius="$4"
              pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
              onPress={handleGetStarted}
              disabled={createAnonymous.isPending}
            >
              <Text color="white" fontWeight="700" fontSize="$5">
                {createAnonymous.isPending ? 'Loading...' : 'Get Started'}
              </Text>
            </Button>

            <Button
              size="$6"
              height={56}
              backgroundColor="white"
              borderWidth={2}
              borderColor="#e4e4e7"
              borderRadius="$4"
              pressStyle={{ backgroundColor: '#f4f4f5', scale: 0.98 }}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text color="#18181b" fontWeight="600" fontSize="$5">
                I already have an account
              </Text>
            </Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    </LinearGradient>
  );
}
