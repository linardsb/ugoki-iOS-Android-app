import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, H2, Text, Button, Progress, Checkbox, Label } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { User, UserCircle, Check, Warning, FirstAid, Heart } from 'phosphor-react-native';

import { appStorage } from '@/shared/stores/storage';
import { useSaveOnboarding, type OnboardingData, type GoalType, type FitnessLevel, type Gender } from '@/features/profile';

// Onboarding steps data
const GENDER_OPTIONS: { id: Gender; label: string; icon: string }[] = [
  { id: 'male', label: 'Male', icon: '👨' },
  { id: 'female', label: 'Female', icon: '👩' },
  { id: 'other', label: 'Other', icon: '🧑' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: '❔' },
];

const GOALS: { id: GoalType; label: string; icon: string }[] = [
  { id: 'weight_loss', label: 'Lose weight', icon: '🎯' },
  { id: 'improve_fitness', label: 'Boost energy', icon: '⚡' },
  { id: 'muscle_gain', label: 'Build strength', icon: '💪' },
  { id: 'better_sleep', label: 'Better wellness', icon: '🧘' },
];

const EXPERIENCE: { id: FitnessLevel; label: string; description: string }[] = [
  { id: 'beginner', label: "I'm completely new", description: "We'll start you off easy" },
  { id: 'intermediate', label: "I've tried it before", description: 'Some experience with fasting' },
  { id: 'advanced', label: 'I fast regularly', description: "You know what you're doing" },
];

const EATING_TIMES: { id: 'early' | 'mid' | 'late'; label: string; window: string }[] = [
  { id: 'early', label: 'Before 10am', window: '6am - 2pm' },
  { id: 'mid', label: '10am - 12pm', window: '10am - 6pm' },
  { id: 'late', label: 'After 12pm', window: '12pm - 8pm' },
];

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    gender: null,
    goal: null,
    experience: null,
    eatingTime: null,
  });

  // Save onboarding data using the profile hook
  const saveProfile = useSaveOnboarding({
    onSuccess: () => {
      appStorage.setOnboardingCompleted(true);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      console.error('Failed to save profile:', error);
      // Still continue to app, can fill in later
      appStorage.setOnboardingCompleted(true);
      router.replace('/(tabs)');
    },
  });

  const handleSelect = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Final step - save and continue
      saveProfile.mutate(data);
    }
  };

  const handleSkip = () => {
    appStorage.setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  const canContinue = () => {
    switch (step) {
      case 0:
        return disclaimerAccepted; // Must accept health disclaimer
      case 1:
        return data.gender !== null;
      case 2:
        return data.goal !== null;
      case 3:
        return data.experience !== null;
      case 4:
        return true; // Eating time is optional
      default:
        return false;
    }
  };

  // Check if current step can be skipped (disclaimer cannot be skipped)
  const canSkip = step > 0;

  const renderStep = () => {
    switch (step) {
      // Step 0: Health Disclaimer (REQUIRED)
      case 0:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <XStack gap="$2" alignItems="center">
                <FirstAid size={28} color="#f97316" weight="fill" />
                <H2 color="$color">Important Health Information</H2>
              </XStack>
              <Text color="$colorMuted" fontSize="$3">
                Please read before continuing
              </Text>
            </YStack>

            <ScrollView style={styles.disclaimerScroll} showsVerticalScrollIndicator={true}>
              <YStack gap="$4" paddingBottom="$4">
                {/* What UGOKI is NOT */}
                <YStack
                  backgroundColor="$cardBackground"
                  padding="$4"
                  borderRadius="$4"
                  borderLeftWidth={4}
                  borderLeftColor="#ef4444"
                >
                  <Text fontWeight="700" fontSize="$4" color="$color" marginBottom="$2">
                    UGOKI is NOT:
                  </Text>
                  <YStack gap="$2">
                    <Text fontSize="$3" color="$colorMuted">• A medical device</Text>
                    <Text fontSize="$3" color="$colorMuted">• A substitute for professional medical advice</Text>
                    <Text fontSize="$3" color="$colorMuted">• Intended to diagnose, treat, cure, or prevent any disease</Text>
                  </YStack>
                </YStack>

                {/* Consult Healthcare Provider */}
                <YStack
                  backgroundColor="$cardBackground"
                  padding="$4"
                  borderRadius="$4"
                  borderLeftWidth={4}
                  borderLeftColor="#f97316"
                >
                  <Text fontWeight="700" fontSize="$4" color="$color" marginBottom="$2">
                    Consult a healthcare provider before use if you:
                  </Text>
                  <YStack gap="$2">
                    <Text fontSize="$3" color="$colorMuted">• Have diabetes or blood sugar issues</Text>
                    <Text fontSize="$3" color="$colorMuted">• Have or have had an eating disorder</Text>
                    <Text fontSize="$3" color="$colorMuted">• Are pregnant, breastfeeding, or planning pregnancy</Text>
                    <Text fontSize="$3" color="$colorMuted">• Have cardiovascular or chronic conditions</Text>
                    <Text fontSize="$3" color="$colorMuted">• Take medications affected by fasting</Text>
                    <Text fontSize="$3" color="$colorMuted">• Are under 18 or over 70 years of age</Text>
                    <Text fontSize="$3" color="$colorMuted">• Have a BMI under 18.5</Text>
                  </YStack>
                </YStack>

                {/* AI Coach Limitations */}
                <YStack
                  backgroundColor="$cardBackground"
                  padding="$4"
                  borderRadius="$4"
                  borderLeftWidth={4}
                  borderLeftColor="#3b82f6"
                >
                  <Text fontWeight="700" fontSize="$4" color="$color" marginBottom="$2">
                    AI Coach Limitations
                  </Text>
                  <Text fontSize="$3" color="$colorMuted" lineHeight={20}>
                    The AI Coach provides general wellness information only. It cannot and does not provide medical advice. Any information should not be relied upon for medical decisions.
                  </Text>
                </YStack>

                {/* Safety Warning */}
                <YStack
                  backgroundColor="#fef3c7"
                  padding="$4"
                  borderRadius="$4"
                >
                  <XStack gap="$2" alignItems="center" marginBottom="$2">
                    <Warning size={20} color="#d97706" weight="fill" />
                    <Text fontWeight="700" fontSize="$4" color="#92400e">
                      Important
                    </Text>
                  </XStack>
                  <Text fontSize="$3" color="#78350f" lineHeight={20}>
                    If you experience any adverse health effects while using this app, discontinue use and consult a healthcare professional immediately.
                  </Text>
                </YStack>
              </YStack>
            </ScrollView>

            {/* Acknowledgment Checkbox */}
            <XStack
              gap="$3"
              alignItems="center"
              padding="$4"
              backgroundColor="$cardBackground"
              borderRadius="$4"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDisclaimerAccepted(!disclaimerAccepted);
              }}
            >
              <YStack
                width={28}
                height={28}
                borderRadius={6}
                borderWidth={2}
                borderColor={disclaimerAccepted ? '$primary' : '$borderColor'}
                backgroundColor={disclaimerAccepted ? '$primary' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                {disclaimerAccepted && <Check size={18} color="white" weight="bold" />}
              </YStack>
              <Text fontSize="$3" color="$color" flex={1} lineHeight={20}>
                I understand that UGOKI provides general wellness information only and is not a substitute for professional medical advice
              </Text>
            </XStack>
          </YStack>
        );

      // Step 1: Gender Selection
      case 1:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <H2 color="$color">Let's personalize your experience</H2>
              <Text color="$colorMuted">How should we address you?</Text>
            </YStack>

            <YStack gap="$3" flex={1}>
              {GENDER_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  size="$6"
                  height={60}
                  backgroundColor={data.gender === option.id ? '$primary' : 'white'}
                  borderWidth={2}
                  borderColor={data.gender === option.id ? '$primary' : '$borderColor'}
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: data.gender === option.id ? '$primaryPress' : '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleSelect('gender', option.id)}
                >
                  <XStack gap="$3" alignItems="center">
                    <Text fontSize="$6">{option.icon}</Text>
                    <Text
                      color={data.gender === option.id ? 'white' : '$color'}
                      fontWeight="600"
                      fontSize="$5"
                    >
                      {option.label}
                    </Text>
                  </XStack>
                </Button>
              ))}
            </YStack>
          </YStack>
        );

      // Step 2: Goals
      case 2:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <H2 color="$color">What brings you to UGOKI?</H2>
              <Text color="$colorMuted">Choose your primary goal</Text>
            </YStack>

            <YStack gap="$3" flex={1}>
              {GOALS.map((goal) => (
                <Button
                  key={goal.id}
                  size="$6"
                  height={60}
                  backgroundColor={data.goal === goal.id ? '$primary' : 'white'}
                  borderWidth={2}
                  borderColor={data.goal === goal.id ? '$primary' : '$borderColor'}
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: data.goal === goal.id ? '$primaryPress' : '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleSelect('goal', goal.id)}
                >
                  <XStack gap="$3" alignItems="center">
                    <Text fontSize="$6">{goal.icon}</Text>
                    <Text
                      color={data.goal === goal.id ? 'white' : '$color'}
                      fontWeight="600"
                      fontSize="$5"
                    >
                      {goal.label}
                    </Text>
                  </XStack>
                </Button>
              ))}
            </YStack>
          </YStack>
        );

      // Step 3: Experience
      case 3:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <H2 color="$color">Fasting experience?</H2>
              <Text color="$colorMuted">We'll personalize your plan</Text>
            </YStack>

            <YStack gap="$3" flex={1}>
              {EXPERIENCE.map((exp) => (
                <Button
                  key={exp.id}
                  size="$6"
                  height={72}
                  paddingVertical="$4"
                  backgroundColor={data.experience === exp.id ? '$primary' : 'white'}
                  borderWidth={2}
                  borderColor={data.experience === exp.id ? '$primary' : '$borderColor'}
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: data.experience === exp.id ? '$primaryPress' : '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleSelect('experience', exp.id)}
                >
                  <YStack gap="$1" alignItems="flex-start" width="100%">
                    <Text
                      color={data.experience === exp.id ? 'white' : '$color'}
                      fontWeight="600"
                      fontSize="$5"
                    >
                      {exp.label}
                    </Text>
                    <Text
                      color={data.experience === exp.id ? 'rgba(255,255,255,0.8)' : '$colorMuted'}
                      fontSize="$3"
                    >
                      {exp.description}
                    </Text>
                  </YStack>
                </Button>
              ))}
            </YStack>
          </YStack>
        );

      // Step 4: Eating Times
      case 4:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <H2 color="$color">When do you eat?</H2>
              <Text color="$colorMuted">We'll suggest an eating window</Text>
            </YStack>

            <YStack gap="$3" flex={1}>
              {EATING_TIMES.map((time) => (
                <Button
                  key={time.id}
                  size="$6"
                  height={72}
                  paddingVertical="$4"
                  backgroundColor={data.eatingTime === time.id ? '$primary' : 'white'}
                  borderWidth={2}
                  borderColor={data.eatingTime === time.id ? '$primary' : '$borderColor'}
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: data.eatingTime === time.id ? '$primaryPress' : '$backgroundHover', scale: 0.98 }}
                  onPress={() => handleSelect('eatingTime', time.id)}
                >
                  <YStack gap="$1" alignItems="flex-start" width="100%">
                    <Text
                      color={data.eatingTime === time.id ? 'white' : '$color'}
                      fontWeight="600"
                      fontSize="$5"
                    >
                      {time.label}
                    </Text>
                    <Text
                      color={data.eatingTime === time.id ? 'rgba(255,255,255,0.8)' : '$colorMuted'}
                      fontSize="$3"
                    >
                      Suggested window: {time.window}
                    </Text>
                  </YStack>
                </Button>
              ))}
            </YStack>
          </YStack>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$6" backgroundColor="$background">
        {/* Progress */}
        <YStack gap="$2" marginBottom="$6">
          <XStack justifyContent="space-between" alignItems="center">
            <Text color="$colorMuted" fontSize="$3">
              Step {step + 1} of {TOTAL_STEPS}
            </Text>
            {canSkip && (
              <Button
                size="$2"
                backgroundColor="transparent"
                pressStyle={{ backgroundColor: 'transparent' }}
                onPress={handleSkip}
              >
                <Text color="$colorMuted">Skip</Text>
              </Button>
            )}
          </XStack>
          <Progress value={((step + 1) / TOTAL_STEPS) * 100} max={100}>
            <Progress.Indicator backgroundColor="$primary" />
          </Progress>
        </YStack>

        {/* Step content */}
        {renderStep()}

        {/* Continue button */}
        <Button
          size="$6"
          height={56}
          backgroundColor={canContinue() ? '$primary' : '$backgroundHover'}
          borderRadius="$4"
          pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
          onPress={handleNext}
          disabled={!canContinue() || saveProfile.isPending}
          marginTop="$4"
        >
          <Text color={canContinue() ? 'white' : '$colorMuted'} fontWeight="700" fontSize="$5">
            {step === 0
              ? 'I Understand, Continue'
              : step === TOTAL_STEPS - 1
                ? saveProfile.isPending
                  ? 'Setting up...'
                  : 'Start My Journey'
                : 'Continue'}
          </Text>
        </Button>
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  disclaimerScroll: {
    flex: 1,
  },
});
