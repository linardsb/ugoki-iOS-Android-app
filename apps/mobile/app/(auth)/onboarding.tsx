import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, H2, Text, Button, Progress, Checkbox, Label, Input, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { User, UserCircle, Check, Warning, FirstAid, Heart, CaretDown, CaretUp, Ruler, Scales } from 'phosphor-react-native';

import { appStorage } from '@/shared/stores/storage';
import { useSaveOnboarding, type OnboardingData, type GoalType, type FitnessLevel, type Gender, type UnitSystem } from '@/features/profile';

// Onboarding steps data
const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

const GOALS: { id: GoalType; label: string }[] = [
  { id: 'weight_loss', label: 'Lose weight' },
  { id: 'improve_fitness', label: 'Boost energy' },
  { id: 'muscle_gain', label: 'Build strength' },
  { id: 'better_sleep', label: 'Better wellness' },
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

const TOTAL_STEPS = 6;

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const mutedColor = theme.colorMuted.val;
  const [step, setStep] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  // Health metrics state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');

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
      const cm = parseFloat(heightCm);
      return isNaN(cm) ? null : cm;
    } else {
      const ft = parseFloat(heightFt) || 0;
      const inches = parseFloat(heightIn) || 0;
      const totalInches = ft * 12 + inches;
      return totalInches > 0 ? Math.round(totalInches * 2.54) : null;
    }
  };

  // Calculate weight in kg from inputs
  const getWeightKg = (): number | null => {
    if (unitSystem === 'metric') {
      const kg = parseFloat(weightKg);
      return isNaN(kg) ? null : kg;
    } else {
      const lbs = parseFloat(weightLbs);
      return isNaN(lbs) ? null : Math.round(lbs * 0.453592 * 10) / 10;
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
                <XStack
                  backgroundColor="$cardBackground"
                  padding="$4"
                  borderRadius="$4"
                  alignItems="center"
                  justifyContent="space-between"
                  pressStyle={{ opacity: 0.8 }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowFullDisclaimer(!showFullDisclaimer);
                  }}
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
                  <Text
                    color={data.gender === option.id ? 'white' : '$color'}
                    fontWeight="600"
                    fontSize="$5"
                  >
                    {option.label}
                  </Text>
                </Button>
              ))}
            </YStack>
          </YStack>
        );

      // Step 2: Health Metrics (Height & Weight)
      case 2:
        return (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <H2 color="$color">Your measurements</H2>
              <Text color="$colorMuted">Optional - helps personalize recommendations</Text>
            </YStack>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <YStack gap="$4" paddingBottom="$4">
                {/* Unit System Toggle */}
                <YStack gap="$2">
                  <Text color="$color" fontWeight="500" fontSize="$4">
                    Measurement Units
                  </Text>
                  <XStack gap="$2">
                    <Button
                      flex={1}
                      size="$5"
                      height={48}
                      backgroundColor={unitSystem === 'metric' ? '$primary' : 'white'}
                      borderColor={unitSystem === 'metric' ? '$primary' : '$borderColor'}
                      borderWidth={2}
                      borderRadius="$4"
                      pressStyle={{ scale: 0.98 }}
                      onPress={() => setUnitSystem('metric')}
                    >
                      <Text
                        color={unitSystem === 'metric' ? 'white' : '$color'}
                        fontWeight="600"
                        fontSize="$4"
                      >
                        Metric
                      </Text>
                    </Button>
                    <Button
                      flex={1}
                      size="$5"
                      height={48}
                      backgroundColor={unitSystem === 'imperial' ? '$primary' : 'white'}
                      borderColor={unitSystem === 'imperial' ? '$primary' : '$borderColor'}
                      borderWidth={2}
                      borderRadius="$4"
                      pressStyle={{ scale: 0.98 }}
                      onPress={() => setUnitSystem('imperial')}
                    >
                      <Text
                        color={unitSystem === 'imperial' ? 'white' : '$color'}
                        fontWeight="600"
                        fontSize="$4"
                      >
                        Imperial
                      </Text>
                    </Button>
                  </XStack>
                </YStack>

                {/* Height Input */}
                <YStack gap="$2">
                  <XStack gap="$2" alignItems="center">
                    <Ruler size={20} color={mutedColor} weight="regular" />
                    <Text color="$color" fontWeight="500" fontSize="$4">
                      Height {unitSystem === 'metric' ? '(cm)' : '(ft / in)'}
                    </Text>
                  </XStack>
                  {unitSystem === 'metric' ? (
                    <Input
                      size="$5"
                      height={56}
                      placeholder="e.g. 175"
                      placeholderTextColor={mutedColor}
                      keyboardType="numeric"
                      backgroundColor="white"
                      borderColor="$borderColor"
                      borderWidth={2}
                      borderRadius="$4"
                      color="$color"
                      fontSize="$5"
                      textAlign="center"
                      focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                      value={heightCm}
                      onChangeText={setHeightCm}
                    />
                  ) : (
                    <XStack gap="$2">
                      <YStack flex={1} gap="$1">
                        <Input
                          size="$5"
                          height={56}
                          placeholder="ft"
                          placeholderTextColor={mutedColor}
                          keyboardType="numeric"
                          backgroundColor="white"
                          borderColor="$borderColor"
                          borderWidth={2}
                          borderRadius="$4"
                          color="$color"
                          fontSize="$5"
                          textAlign="center"
                          focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                          value={heightFt}
                          onChangeText={setHeightFt}
                        />
                        <Text color="$colorMuted" fontSize="$2" textAlign="center">feet</Text>
                      </YStack>
                      <YStack flex={1} gap="$1">
                        <Input
                          size="$5"
                          height={56}
                          placeholder="in"
                          placeholderTextColor={mutedColor}
                          keyboardType="numeric"
                          backgroundColor="white"
                          borderColor="$borderColor"
                          borderWidth={2}
                          borderRadius="$4"
                          color="$color"
                          fontSize="$5"
                          textAlign="center"
                          focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                          value={heightIn}
                          onChangeText={setHeightIn}
                        />
                        <Text color="$colorMuted" fontSize="$2" textAlign="center">inches</Text>
                      </YStack>
                    </XStack>
                  )}
                </YStack>

                {/* Weight Input */}
                <YStack gap="$2">
                  <XStack gap="$2" alignItems="center">
                    <Scales size={20} color={mutedColor} weight="regular" />
                    <Text color="$color" fontWeight="500" fontSize="$4">
                      Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
                    </Text>
                  </XStack>
                  <Input
                    size="$5"
                    height={56}
                    placeholder={unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'}
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    backgroundColor="white"
                    borderColor="$borderColor"
                    borderWidth={2}
                    borderRadius="$4"
                    color="$color"
                    fontSize="$5"
                    textAlign="center"
                    focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                    value={unitSystem === 'metric' ? weightKg : weightLbs}
                    onChangeText={unitSystem === 'metric' ? setWeightKg : setWeightLbs}
                  />
                </YStack>

                {/* Info note */}
                <YStack
                  backgroundColor="$cardBackground"
                  padding="$3"
                  borderRadius="$3"
                  gap="$2"
                >
                  <Text fontSize="$3" color="$colorMuted" lineHeight={20}>
                    You can update these anytime in Settings, and log weight changes from the dashboard.
                  </Text>
                </YStack>
              </YStack>
            </ScrollView>
          </YStack>
        );

      // Step 3: Goals
      case 3:
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
                  <Text
                    color={data.goal === goal.id ? 'white' : '$color'}
                    fontWeight="600"
                    fontSize="$5"
                  >
                    {goal.label}
                  </Text>
                </Button>
              ))}
            </YStack>
          </YStack>
        );

      // Step 4: Experience
      case 4:
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

      // Step 5: Eating Times
      case 5:
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
