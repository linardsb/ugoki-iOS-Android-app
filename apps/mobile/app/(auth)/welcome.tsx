import { useState } from 'react';
import { YStack, XStack, H1, Text, Button } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from 'react-native';

import { useCreateAnonymous } from '@/features/auth';

export default function WelcomeScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
            <YStack
              width={120}
              height={120}
              borderRadius="$6"
              backgroundColor="$primary"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize={48} fontWeight="bold" color="white">
                U
              </Text>
            </YStack>

            <H1 fontSize={42} fontWeight="bold" textAlign="center" color="#18181b">
              UGOKI
            </H1>

            <Text
              fontSize="$5"
              color="#71717a"
              textAlign="center"
              maxWidth={280}
            >
              Intermittent Fasting meets HIIT Training
            </Text>

            <YStack gap="$2" marginTop="$4">
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$4">🎯</Text>
                <Text color="#18181b">Personalized fasting protocols</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$4">💪</Text>
                <Text color="#18181b">15-minute HIIT workouts</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$4">🤖</Text>
                <Text color="#18181b">AI-powered coaching</Text>
              </XStack>
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
