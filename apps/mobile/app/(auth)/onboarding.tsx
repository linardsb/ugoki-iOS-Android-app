import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Pressable } from 'react-native';
import { YStack, XStack, H2, Text, Button, Progress, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GenderMale, GenderFemale, Check, Warning, Heart, CaretDown, CaretUp, Target, Lightning, Barbell, Moon } from 'phosphor-react-native';

import { appStorage } from '@/shared/stores/storage';
import { useSaveOnboarding, type OnboardingData, type GoalType, type FitnessLevel, type Gender, type UnitSystem } from '@/features/profile';
import {
  CircularIconButton,
  UnitToggle,
  HorizontalNumberPicker,
  VerticalRulerPicker,
  PillSelector,
} from '@/shared/components/ui/onboarding';

// Onboarding steps data
const GENDER_OPTIONS: { id: Gender; label: string; icon: 'male' | 'female' }[] = [
  { id: 'male', label: 'Male', icon: 'male' },
  { id: 'female', label: 'Female', icon: 'female' },
];

const GOALS: { id: GoalType; label: string; icon: React.ReactNode }[] = [
  { id: 'weight_loss', label: 'Lose weight', icon: <Target size={24} weight="fill" /> },
  { id: 'improve_fitness', label: 'Boost energy', icon: <Lightning size={24} weight="fill" /> },
  { id: 'muscle_gain', label: 'Build strength', icon: <Barbell size={24} weight="fill" /> },
  { id: 'better_sleep', label: 'Better wellness', icon: <Moon size={24} weight="fill" /> },
];

const EXPERIENCE: { id: FitnessLevel; label: string; description: string }[] = [
  { id: 'beginner', label: "I'm completely new", description: "We'll start you off easy" },
  { id: 'intermediate', label: "I've tried it before", description: 'Some experience with fasting' },
  { id: 'advanced', label: 'I fast regularly', description: "You know what you're doing" },
];

const EATING_TIMES: { id: 'early' | 'mid' | 'late'; label: string; description: string }[] = [
  { id: 'early', label: 'Before 10am', description: 'Suggested window: 6am - 2pm' },
  { id: 'mid', label: '10am - 12pm', description: 'Suggested window: 10am - 6pm' },
  { id: 'late', label: 'After 12pm', description: 'Suggested window: 12pm - 8pm' },
];

const TOTAL_STEPS = 6;

// Height and weight ranges
const HEIGHT_CM_MIN = 120;
const HEIGHT_CM_MAX = 220;
const HEIGHT_FT_MIN = 4;
const HEIGHT_FT_MAX = 7;
const HEIGHT_IN_MIN = 0;
const HEIGHT_IN_MAX = 11;
const WEIGHT_KG_MIN = 30;
const WEIGHT_KG_MAX = 200;
const WEIGHT_LBS_MIN = 66;
const WEIGHT_LBS_MAX = 440;

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  // Health metrics state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [heightCm, setHeightCm] = useState(170);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(7);
  const [weightKg, setWeightKg] = useState(70);
  const [weightLbs, setWeightLbs] = useState(154);

  const [data, setData] = useState<OnboardingData>({
    gender: null,
    goal: null,
    experience: null,
    eatingTime: null,
    unitSystem: 'metric',
    heightCm: null,
    weightKg: null,
  });

  // Save onboarding data using the profile hook
  const saveProfile = useSaveOnboarding({
    onSuccess: async () => {
      await appStorage.setOnboardingCompleted(true);
      router.replace('/(tabs)');
    },
    onError: async (error) => {
      console.error('Failed to save profile:', error);
      // Still continue to app, can fill in later
      await appStorage.setOnboardingCompleted(true);
      router.replace('/(tabs)');
    },
  });

  const handleSelect = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate height in cm from inputs
  const getHeightCm = (): number | null => {
    if (unitSystem === 'metric') {
      return heightCm;
    } else {
      const totalInches = heightFt * 12 + heightIn;
      return totalInches > 0 ? Math.round(totalInches * 2.54) : null;
    }
  };

  // Calculate weight in kg from inputs
  const getWeightKg = (): number | null => {
    if (unitSystem === 'metric') {
      return weightKg;
    } else {
      return Math.round(weightLbs * 0.453592 * 10) / 10;
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If on health metrics step, update data with calculated values
    if (step === 2) {
      setData((prev) => ({
        ...prev,
        unitSystem,
        heightCm: getHeightCm(),
        weightKg: getWeightKg(),
      }));
    }

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Final step - save and continue with updated health metrics
      const finalData = {
        ...data,
        unitSystem,
        heightCm: getHeightCm(),
        weightKg: getWeightKg(),
      };
      saveProfile.mutate(finalData);
    }
  };

  const handleSkip = async () => {
    await appStorage.setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  const canContinue = () => {
    switch (step) {
      case 0:
        return disclaimerAccepted; // Must accept health disclaimer
      case 1:
        return data.gender !== null;
      case 2:
        return true; // Health metrics are optional
      case 3:
        return data.goal !== null;
      case 4:
        return data.experience !== null;
      case 5:
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
          <YStack gap="$5" flex={1}>
            {/* Header */}
            <YStack gap="$3" alignItems="center" paddingTop="$2">
              <YStack
                width={64}
                height={64}
                borderRadius={32}
                backgroundColor="$primary"
                opacity={0.1}
                position="absolute"
              />
              <YStack
                width={56}
                height={56}
                borderRadius={28}
                backgroundColor="$primary"
                justifyContent="center"
                alignItems="center"
              >
                <Heart size={28} color="white" weight="fill" />
              </YStack>
              <YStack gap="$1" alignItems="center">
                <H2 color="$color" textAlign="center">Before We Begin</H2>
                <Text color="$colorMuted" fontSize="$3" textAlign="center">
                  Your health & safety come first
                </Text>
              </YStack>
            </YStack>

            <ScrollView style={styles.disclaimerScroll} showsVerticalScrollIndicator={false}>
              <YStack gap="$3" paddingBottom="$4">
                {/* Quick Summary Card */}
                <YStack
                  backgroundColor="$primary"
                  padding="$4"
                  borderRadius="$5"
                >
                  <Text color="white" fontSize="$4" fontWeight="600" marginBottom="$2">
                    UGOKI helps you build healthy habits
                  </Text>
                  <Text color="rgba(255,255,255,0.85)" fontSize="$3" lineHeight={22}>
                    We combine intermittent fasting with quick workouts, guided by AI coaching tailored to your goals.
                  </Text>
                </YStack>

                {/* Important Note */}
                <YStack
                  backgroundColor="$cardBackground"
                  padding="$4"
                  borderRadius="$4"
                  gap="$3"
                >
                  <XStack gap="$2" alignItems="center">
                    <Warning size={20} color="#f97316" weight="fill" />
                    <Text fontWeight="600" fontSize="$4" color="$color">
                      Check with your doctor first if you:
                    </Text>
                  </XStack>
                  <YStack gap="$2" paddingLeft="$1">
                    <Text fontSize="$3" color="$colorMuted">• Have diabetes or blood sugar concerns</Text>
                    <Text fontSize="$3" color="$colorMuted">• Are pregnant or breastfeeding</Text>
                    <Text fontSize="$3" color="$colorMuted">• Have a history of eating disorders</Text>
                    <Text fontSize="$3" color="$colorMuted">• Take medications affected by fasting</Text>
                    <Text fontSize="$3" color="$colorMuted">• Are under 18 or over 70 years old</Text>
                  </YStack>
                </YStack>

                {/* Disclaimer */}
                <YStack
                  backgroundColor="$cardBackground"
                  padding="$4"
                  borderRadius="$4"
                  gap="$2"
                >
                  <Text fontSize="$3" color="$colorMuted" lineHeight={20}>
                    UGOKI is a wellness app, not a medical device. Our AI coach provides general guidance only and cannot replace professional medical advice.
                  </Text>
                  <Text fontSize="$3" color="$colorMuted" lineHeight={20}>
                    If you feel unwell while fasting or exercising, stop and consult a healthcare provider.
                  </Text>
                </YStack>

                {/* Full Disclaimer Collapsible */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowFullDisclaimer(!showFullDisclaimer);
                  }}
                >
                  <XStack
                    backgroundColor="$cardBackground"
                    padding="$4"
                    borderRadius="$4"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <XStack gap="$3" alignItems="center" flex={1}>
                      <YStack
                        width={40}
                        height={40}
                        borderRadius="$3"
                        backgroundColor="#ef444420"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Warning size={20} color="#ef4444" weight="fill" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize="$4" fontWeight="600" color="$color">
                          Full Health Disclaimer
                        </Text>
                        <Text fontSize="$3" color="$colorMuted">
                          Important safety information
                        </Text>
                      </YStack>
                    </XStack>
                    {showFullDisclaimer ? (
                      <CaretUp size={20} color="#666" />
                    ) : (
                      <CaretDown size={20} color="#666" />
                    )}
                  </XStack>
                </Pressable>

                {showFullDisclaimer && (
                  <YStack gap="$3">
                    {/* UGOKI is NOT */}
                    <YStack
                      backgroundColor="$cardBackground"
                      padding="$4"
                      borderRadius="$4"
                      borderLeftWidth={3}
                      borderLeftColor="#ef4444"
                    >
                      <Text fontSize="$4" fontWeight="600" color="$color" marginBottom="$2">
                        UGOKI is NOT:
                      </Text>
                      <YStack gap="$2">
                        <Text fontSize="$3" color="$colorMuted">• A medical device</Text>
                        <Text fontSize="$3" color="$colorMuted">• A substitute for professional medical advice</Text>
                        <Text fontSize="$3" color="$colorMuted">• Intended to diagnose, treat, cure, or prevent any disease</Text>
                        <Text fontSize="$3" color="$colorMuted">• Suitable for individuals with certain health conditions without medical supervision</Text>
                      </YStack>
                    </YStack>

                    {/* Consult healthcare provider */}
                    <YStack
                      backgroundColor="$cardBackground"
                      padding="$4"
                      borderRadius="$4"
                      borderLeftWidth={3}
                      borderLeftColor="#f97316"
                    >
                      <Text fontSize="$4" fontWeight="600" color="$color" marginBottom="$2">
                        Consult a healthcare provider before use if you:
                      </Text>
                      <YStack gap="$2">
                        <Text fontSize="$3" color="$colorMuted">• Have diabetes or blood sugar regulation issues</Text>
                        <Text fontSize="$3" color="$colorMuted">• Have or have had an eating disorder</Text>
                        <Text fontSize="$3" color="$colorMuted">• Are pregnant, breastfeeding, or planning to become pregnant</Text>
                        <Text fontSize="$3" color="$colorMuted">• Have cardiovascular disease or other chronic conditions</Text>
                        <Text fontSize="$3" color="$colorMuted">• Take medications that may be affected by fasting</Text>
                        <Text fontSize="$3" color="$colorMuted">• Are under 18 or over 70 years of age</Text>
                        <Text fontSize="$3" color="$colorMuted">• Have a BMI under 18.5</Text>
                      </YStack>
                    </YStack>

                    {/* AI Coach Limitations */}
                    <YStack
                      backgroundColor="$cardBackground"
                      padding="$4"
                      borderRadius="$4"
                      borderLeftWidth={3}
                      borderLeftColor="#3b82f6"
                    >
                      <Text fontSize="$4" fontWeight="600" color="$color" marginBottom="$2">
                        AI Coach Limitations
                      </Text>
                      <Text fontSize="$3" color="$colorMuted" lineHeight={20}>
                        The AI Coach feature provides general wellness information only. It cannot and does not provide medical advice. Any information provided by the AI Coach should not be relied upon for medical decisions.
                      </Text>
                    </YStack>

                    {/* Important Warning */}
                    <YStack
                      backgroundColor="#fef3c7"
                      padding="$4"
                      borderRadius="$4"
                    >
                      <XStack gap="$2" alignItems="center" marginBottom="$2">
                        <Warning size={18} color="#d97706" weight="fill" />
                        <Text fontSize="$4" fontWeight="600" color="#92400e">
                          Important
                        </Text>
                      </XStack>
                      <Text fontSize="$3" color="#92400e" lineHeight={20}>
                        If you experience any adverse health effects while using this app, discontinue use and consult a healthcare professional immediately.
                      </Text>
                    </YStack>
                  </YStack>
                )}
              </YStack>
            </ScrollView>

            {/* Acknowledgment Checkbox */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDisclaimerAccepted(!disclaimerAccepted);
              }}
            >
              <XStack
                gap="$3"
                alignItems="center"
                padding="$4"
                backgroundColor="$cardBackground"
                borderRadius="$4"
              >
                <YStack
                  width={24}
                  height={24}
                  borderRadius={12}
                  borderWidth={2}
                  borderColor={disclaimerAccepted ? '$primary' : '$borderColor'}
                  backgroundColor={disclaimerAccepted ? '$primary' : 'transparent'}
                  justifyContent="center"
                  alignItems="center"
                >
                  {disclaimerAccepted && <Check size={14} color="white" weight="bold" />}
                </YStack>
                <Text fontSize="$3" color="$color" flex={1} lineHeight={20}>
                  I understand and want to continue
                </Text>
              </XStack>
            </Pressable>
          </YStack>
        );

      // Step 1: Gender Selection with Circular Icons
      case 1:
        return (
          <YStack gap="$6" flex={1}>
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">Let's personalise your experience</Text>
              <Text color="$colorMuted" textAlign="center">How should we address you?</Text>
            </YStack>

            <XStack justifyContent="center" gap="$8" paddingTop="$6">
              {GENDER_OPTIONS.map((option) => (
                <CircularIconButton
                  key={option.id}
                  icon={
                    option.icon === 'male' ? (
                      <GenderMale weight="bold" />
                    ) : (
                      <GenderFemale weight="bold" />
                    )
                  }
                  label={option.label}
                  selected={data.gender === option.id}
                  onPress={() => handleSelect('gender', option.id)}
                  size={90}
                />
              ))}
            </XStack>
          </YStack>
        );

      // Step 2: Health Metrics (Height & Weight) with Pickers
      case 2:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">Your measurements</Text>
              <Text color="$colorMuted" textAlign="center">Optional - helps personalise recommendations</Text>
            </YStack>

            <YStack gap="$5" flex={1}>
              {/* Unit System Toggle */}
              <UnitToggle
                value={unitSystem}
                onChange={setUnitSystem}
                options={{ metric: 'Metric', imperial: 'Imperial' }}
              />

              {/* Height Picker */}
              <YStack gap="$2">
                <Text color="$colorMuted" fontWeight="500" fontSize="$3" textAlign="center">
                  Height
                </Text>
                {unitSystem === 'metric' ? (
                  <VerticalRulerPicker
                    min={HEIGHT_CM_MIN}
                    max={HEIGHT_CM_MAX}
                    value={heightCm}
                    onChange={setHeightCm}
                    unit="cm"
                  />
                ) : (
                  <XStack gap="$4" justifyContent="center">
                    <YStack flex={1} gap="$1" alignItems="center">
                      <Text color="$color" fontSize="$6" fontWeight="700">{heightFt} <Text fontSize="$3" color="$colorMuted">ft</Text></Text>
                      <HorizontalNumberPicker
                        min={HEIGHT_FT_MIN}
                        max={HEIGHT_FT_MAX}
                        value={heightFt}
                        onChange={setHeightFt}
                        unit="ft"
                        compact
                      />
                    </YStack>
                    <YStack flex={1} gap="$1" alignItems="center">
                      <Text color="$color" fontSize="$6" fontWeight="700">{heightIn} <Text fontSize="$3" color="$colorMuted">in</Text></Text>
                      <HorizontalNumberPicker
                        min={HEIGHT_IN_MIN}
                        max={HEIGHT_IN_MAX}
                        value={heightIn}
                        onChange={setHeightIn}
                        unit="in"
                        compact
                      />
                    </YStack>
                  </XStack>
                )}
              </YStack>

              {/* Weight Picker */}
              <YStack gap="$2" marginTop="$2" marginBottom="$4">
                <Text color="$colorMuted" fontWeight="500" fontSize="$3" textAlign="center">
                  Weight
                </Text>
                <HorizontalNumberPicker
                  min={unitSystem === 'metric' ? WEIGHT_KG_MIN : WEIGHT_LBS_MIN}
                  max={unitSystem === 'metric' ? WEIGHT_KG_MAX : WEIGHT_LBS_MAX}
                  value={unitSystem === 'metric' ? weightKg : weightLbs}
                  onChange={unitSystem === 'metric' ? setWeightKg : setWeightLbs}
                  unit={unitSystem === 'metric' ? 'kg' : 'lbs'}
                />
              </YStack>
            </YStack>
          </YStack>
        );

      // Step 3: Goals with Card List
      case 3:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">What brings you to UGOKI?</Text>
              <Text color="$colorMuted" textAlign="center">Choose your primary goal</Text>
            </YStack>

            <YStack gap="$3" flex={1} paddingTop="$2">
              {GOALS.map((goal) => {
                const isSelected = data.goal === goal.id;
                return (
                  <Pressable key={goal.id} onPress={() => handleSelect('goal', goal.id)}>
                    <XStack
                      backgroundColor={isSelected ? '$primary' : '$cardBackground'}
                      borderRadius="$4"
                      paddingVertical="$4"
                      paddingHorizontal="$4"
                      borderWidth={2}
                      borderColor={isSelected ? '$primary' : '$borderColor'}
                      alignItems="center"
                      gap="$3"
                    >
                      {/* Icon */}
                      <YStack
                        width={44}
                        height={44}
                        borderRadius={22}
                        backgroundColor={isSelected ? 'rgba(255,255,255,0.2)' : '$background'}
                        justifyContent="center"
                        alignItems="center"
                      >
                        {React.isValidElement(goal.icon)
                          ? React.cloneElement(goal.icon as React.ReactElement<{ color?: string }>, {
                              color: isSelected ? '#FFFFFF' : (theme.primary?.val ?? '#3A5BA0'),
                            })
                          : goal.icon}
                      </YStack>

                      {/* Label */}
                      <Text
                        flex={1}
                        fontSize="$5"
                        fontWeight="600"
                        color={isSelected ? 'white' : '$color'}
                      >
                        {goal.label}
                      </Text>

                      {/* Selection indicator */}
                      <YStack
                        width={24}
                        height={24}
                        borderRadius={12}
                        borderWidth={2}
                        borderColor={isSelected ? 'white' : '$borderColor'}
                        backgroundColor={isSelected ? 'white' : 'transparent'}
                        justifyContent="center"
                        alignItems="center"
                      >
                        {isSelected && <Check size={14} color="#3A5BA0" weight="bold" />}
                      </YStack>
                    </XStack>
                  </Pressable>
                );
              })}
            </YStack>
          </YStack>
        );

      // Step 4: Experience with Pill Selector
      case 4:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">Fasting experience?</Text>
              <Text color="$colorMuted" textAlign="center">We'll personalize your plan</Text>
            </YStack>

            <YStack flex={1} paddingTop="$2">
              <PillSelector
                options={EXPERIENCE}
                value={data.experience}
                onChange={(value) => handleSelect('experience', value)}
              />
            </YStack>
          </YStack>
        );

      // Step 5: Eating Times with Pill Selector
      case 5:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">When do you eat?</Text>
              <Text color="$colorMuted" textAlign="center">We'll suggest an eating window</Text>
            </YStack>

            <YStack flex={1} paddingTop="$2">
              <PillSelector
                options={EATING_TIMES}
                value={data.eatingTime}
                onChange={(value) => handleSelect('eatingTime', value)}
              />
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
          borderRadius={999}
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
