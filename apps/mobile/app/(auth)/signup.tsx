import { useState } from 'react';
import { YStack, H1, Text, Button, Input, XStack, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';

type UnitSystem = 'metric' | 'imperial';

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Health metrics state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');

  const handleCreateAccount = () => {
    if (!name || !email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    // Email/password auth coming soon - for now show message
    Alert.alert(
      'Coming Soon',
      'Account creation will be available soon. For now, please use the Get Started button on the welcome screen to continue with anonymous mode.',
      [
        { text: 'Go Back', onPress: () => router.back() },
        { text: 'OK' },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <YStack flex={1} padding="$6" backgroundColor="$background">
          {/* Header */}
          <XStack alignItems="center" gap="$3" marginBottom="$4">
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
              Create account
            </H1>
          </XStack>

          {/* Form - Scrollable */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <YStack gap="$4" paddingBottom="$4">
          <YStack gap="$2">
            <Text color="$color" fontWeight="500">
              Name
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder="Your name"
              placeholderTextColor={mutedColor}
              autoCapitalize="words"
              backgroundColor="$backgroundStrong"
              borderColor="$borderColor"
              borderWidth={1}
              color="$color"
              focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
              value={name}
              onChangeText={setName}
            />
          </YStack>

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
              placeholder="Create a password"
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
            <Text color="$colorMuted" fontSize="$3">
              At least 8 characters
            </Text>
          </YStack>

          {/* Unit System Toggle */}
          <YStack gap="$2">
            <Text color="$color" fontWeight="500">
              Measurement Units
            </Text>
            <XStack gap="$2">
              <Button
                flex={1}
                size="$4"
                height={44}
                backgroundColor={unitSystem === 'metric' ? '$primary' : '$backgroundStrong'}
                borderColor={unitSystem === 'metric' ? '$primary' : '$borderColor'}
                borderWidth={1}
                borderRadius="$3"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => setUnitSystem('metric')}
              >
                <Text
                  color={unitSystem === 'metric' ? 'white' : '$color'}
                  fontWeight="600"
                  fontSize="$3"
                >
                  Metric (kg/cm)
                </Text>
              </Button>
              <Button
                flex={1}
                size="$4"
                height={44}
                backgroundColor={unitSystem === 'imperial' ? '$primary' : '$backgroundStrong'}
                borderColor={unitSystem === 'imperial' ? '$primary' : '$borderColor'}
                borderWidth={1}
                borderRadius="$3"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => setUnitSystem('imperial')}
              >
                <Text
                  color={unitSystem === 'imperial' ? 'white' : '$color'}
                  fontWeight="600"
                  fontSize="$3"
                >
                  Imperial (lb/ft)
                </Text>
              </Button>
            </XStack>
          </YStack>

          {/* Height Input */}
          <YStack gap="$2">
            <Text color="$color" fontWeight="500">
              Height {unitSystem === 'metric' ? '(cm)' : '(ft/in)'}
            </Text>
            {unitSystem === 'metric' ? (
              <Input
                size="$5"
                height={52}
                placeholder="e.g. 175"
                placeholderTextColor={mutedColor}
                keyboardType="numeric"
                backgroundColor="$backgroundStrong"
                borderColor="$borderColor"
                borderWidth={1}
                color="$color"
                focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                value={heightCm}
                onChangeText={setHeightCm}
              />
            ) : (
              <XStack gap="$2">
                <YStack flex={1}>
                  <Input
                    size="$5"
                    height={52}
                    placeholder="ft"
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    backgroundColor="$backgroundStrong"
                    borderColor="$borderColor"
                    borderWidth={1}
                    color="$color"
                    focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                    value={heightFt}
                    onChangeText={setHeightFt}
                  />
                </YStack>
                <YStack flex={1}>
                  <Input
                    size="$5"
                    height={52}
                    placeholder="in"
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    backgroundColor="$backgroundStrong"
                    borderColor="$borderColor"
                    borderWidth={1}
                    color="$color"
                    focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                    value={heightIn}
                    onChangeText={setHeightIn}
                  />
                </YStack>
              </XStack>
            )}
          </YStack>

          {/* Weight Input */}
          <YStack gap="$2">
            <Text color="$color" fontWeight="500">
              Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
            </Text>
            <Input
              size="$5"
              height={52}
              placeholder={unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'}
              placeholderTextColor={mutedColor}
              keyboardType="numeric"
              backgroundColor="$backgroundStrong"
              borderColor="$borderColor"
              borderWidth={1}
              color="$color"
              focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
              value={unitSystem === 'metric' ? weightKg : weightLbs}
              onChangeText={unitSystem === 'metric' ? setWeightKg : setWeightLbs}
            />
            <Text color="$colorMuted" fontSize="$3">
              Optional - helps personalize your experience
            </Text>
          </YStack>
            </YStack>
          </ScrollView>

          {/* Actions */}
          <YStack gap="$3" paddingTop="$2">
            <Button
              size="$6"
              height={56}
              backgroundColor="$primary"
              borderRadius="$4"
              pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
              onPress={handleCreateAccount}
              disabled={isLoading}
              opacity={isLoading ? 0.7 : 1}
            >
              <Text color="white" fontWeight="700" fontSize="$5">
                {isLoading ? 'Creating...' : 'Create Account'}
              </Text>
            </Button>

            <XStack justifyContent="center" gap="$2" alignItems="center">
              <Text color="$colorMuted">Already have an account?</Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text color="#14b8a6" fontWeight="700" fontSize="$4">
                  Sign in
                </Text>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
