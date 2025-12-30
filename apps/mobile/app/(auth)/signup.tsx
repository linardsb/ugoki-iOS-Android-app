import { YStack, H1, Text, Button, Input, XStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';

export default function SignupScreen() {
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
            Create account
          </H1>
        </XStack>

        {/* Form */}
        <YStack gap="$4" flex={1}>
          <YStack gap="$2">
            <Text color="#2B2B32" fontWeight="500">
              Name
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder="Your name"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              backgroundColor="white"
              borderColor="#d1d5db"
              borderWidth={1}
              color="#2B2B32"
              focusStyle={{ borderColor: '#14b8a6', borderWidth: 2 }}
            />
          </YStack>

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
              placeholder="Create a password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              backgroundColor="white"
              borderColor="#d1d5db"
              borderWidth={1}
              color="#2B2B32"
              focusStyle={{ borderColor: '#14b8a6', borderWidth: 2 }}
            />
            <Text color="#6b7280" fontSize="$2">
              At least 8 characters
            </Text>
          </YStack>
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
              Create Account
            </Text>
          </Button>

          <XStack justifyContent="center" gap="$2" alignItems="center">
            <Text color="#6b7280">Already have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text color="#14b8a6" fontWeight="700" fontSize="$4">
                Sign in
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
