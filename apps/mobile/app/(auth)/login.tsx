import { YStack, H1, Text, Button, Input, XStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$6" backgroundColor="$background">
        {/* Header */}
        <XStack alignItems="center" gap="$3" marginBottom="$6">
          <Button
            size="$4"
            circular
            backgroundColor="$cardBackground"
            pressStyle={{ backgroundColor: '$backgroundHover' }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="$color" weight="thin" />
          </Button>
          <H1 color="$color" fontSize="$7">
            Welcome back
          </H1>
        </XStack>

        {/* Form */}
        <YStack gap="$4" flex={1}>
          <YStack gap="$2">
            <Text color="#2B2B32" fontWeight="500">
              Email
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder="your@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              backgroundColor="white"
              borderColor="#d1d5db"
              borderWidth={1}
              color="#2B2B32"
              focusStyle={{ borderColor: '#14b8a6', borderWidth: 2 }}
            />
          </YStack>

          <YStack gap="$2">
            <Text color="#2B2B32" fontWeight="500">
              Password
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder="Enter password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              backgroundColor="white"
              borderColor="#d1d5db"
              borderWidth={1}
              color="#2B2B32"
              focusStyle={{ borderColor: '#14b8a6', borderWidth: 2 }}
            />
          </YStack>

          <Pressable style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
            <Text color="#14b8a6" fontWeight="600" fontSize="$3">Forgot password?</Text>
          </Pressable>
        </YStack>

        {/* Actions */}
        <YStack gap="$3">
          <Button
            size="$6"
            height={56}
            backgroundColor="$primary"
            borderRadius="$4"
            pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
          >
            <Text color="white" fontWeight="700" fontSize="$5">
              Sign In
            </Text>
          </Button>

          <XStack justifyContent="center" gap="$2" alignItems="center">
            <Text color="#6b7280">Don't have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text color="#14b8a6" fontWeight="700" fontSize="$4">
                Sign up
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
