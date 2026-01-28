import { useState } from 'react';
import { YStack, H1, Text, Button, Input, XStack, useTheme } from '@/shared/components/tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    // Email/password auth coming soon - for now show message
    Alert.alert(
      'Coming Soon',
      'Email sign-in will be available soon. For now, please use the Get Started button on the welcome screen to continue with anonymous mode.',
      [
        { text: 'Go Back', onPress: () => router.back() },
        { text: 'OK' },
      ]
    );
  };

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
            <ArrowLeft size={20} color={iconColor} weight="regular" />
          </Button>
          <H1 color="$color" fontSize="$7">
            Welcome back
          </H1>
        </XStack>

        {/* Form */}
        <YStack gap="$4" flex={1}>
          <YStack gap="$2">
            <Text color="$color" fontWeight="500">
              Email
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder="your@email.com"
              placeholderTextColor={mutedColor}
              keyboardType="email-address"
              autoCapitalize="none"
              backgroundColor="$backgroundStrong"
              borderColor="$borderColor"
              borderWidth={1}
              color="$color"
              focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
              value={email}
              onChangeText={setEmail}
            />
          </YStack>

          <YStack gap="$2">
            <Text color="$color" fontWeight="500">
              Password
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder="Enter password"
              placeholderTextColor={mutedColor}
              secureTextEntry
              backgroundColor="$backgroundStrong"
              borderColor="$borderColor"
              borderWidth={1}
              color="$color"
              focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
              value={password}
              onChangeText={setPassword}
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
            onPress={handleSignIn}
            disabled={isLoading}
            opacity={isLoading ? 0.7 : 1}
          >
            <Text color="white" fontWeight="700" fontSize="$5">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Button>

          <XStack justifyContent="center" gap="$2" alignItems="center">
            <Text color="$colorMuted">Don't have an account?</Text>
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
