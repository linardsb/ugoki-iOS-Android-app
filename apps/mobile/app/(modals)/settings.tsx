import { useState, useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Button, Input } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, CaretDown, CaretUp, FileText, CaretRight, Warning, ShieldCheck, GenderMale, GenderFemale, Sparkle, Mountains, Anchor, SmileyWink, UserPlus, Trash } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/shared/stores/auth';
import { appStorage } from '@/shared/stores/storage';
import { AppSwitch } from '@/shared/components/ui';
import {
  useProfile,
  usePreferences,
  useGoals,
  useUpdateProfile,
  useUpdatePreferences,
  useUpdateGoals,
  SettingsSection,
} from '@/features/profile';
import { HealthSyncCard } from '@/features/health';
import { useChatStore, PERSONALITIES } from '@/features/coach';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/features/notifications';
import type { UnitSystem, FastingProtocol, GoalType, Gender } from '@/features/profile';

const GENDER_OPTIONS: { value: Gender; label: string; Icon: typeof GenderMale }[] = [
  { value: 'male', label: 'Male', Icon: GenderMale },
  { value: 'female', label: 'Female', Icon: GenderFemale },
];

const PERSONALITY_ICONS = {
  Sparkle,
  Mountains,
  Anchor,
  SmileyWink,
} as const;

const GOALS: { value: GoalType; label: string }[] = [
  { value: 'weight_loss', label: 'Lose Weight' },
  { value: 'weight_gain', label: 'Gain Weight' },
  { value: 'muscle_gain', label: 'Build Muscle' },
  { value: 'maintain_weight', label: 'Maintain Weight' },
  { value: 'improve_fitness', label: 'Improve Fitness' },
  { value: 'increase_energy', label: 'Increase Energy' },
  { value: 'better_sleep', label: 'Better Sleep' },
  { value: 'reduce_stress', label: 'Reduce Stress' },
];

const FASTING_PROTOCOLS: { value: FastingProtocol; label: string }[] = [
  { value: '16:8', label: '16:8 (16 hours fast)' },
  { value: '18:6', label: '18:6 (18 hours fast)' },
  { value: '20:4', label: '20:4 (20 hours fast)' },
  { value: '24:0', label: '24:0 (Full day fast)' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const iconColor = theme.color.val;
  const mutedIconColor = theme.colorMuted.val;
  const primaryColor = theme.primary.val;

  const { data: profile } = useProfile();
  const { data: preferences } = usePreferences();
  const { data: goals } = useGoals();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isResetting, setIsResetting] = useState(false);

  const updateProfile = useUpdateProfile({
    onSuccess: () => Alert.alert('Success', 'Profile updated'),
    onError: (error) => Alert.alert('Error', error),
  });
  const updatePreferences = useUpdatePreferences({
    onSuccess: () => Alert.alert('Success', 'Preferences updated'),
    onError: (error) => Alert.alert('Error', error),
  });
  const updateGoals = useUpdateGoals({
    onSuccess: () => Alert.alert('Success', 'Goals updated'),
    onError: (error) => Alert.alert('Error', error),
  });

  // Notification preferences
  const { data: notificationPrefs } = useNotificationPreferences();
  const updateNotificationPrefs = useUpdateNotificationPreferences();
  const isNotificationUpdating = updateNotificationPrefs.isPending;

  // Coach personality
  const { personality: coachPersonality, setPersonality: setCoachPersonality } = useChatStore();

  // Local form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [selectedGender, setSelectedGender] = useState<Gender | undefined>(profile?.gender);
  const [selectedGoal, setSelectedGoal] = useState<GoalType>(goals?.primary_goal || 'improve_fitness');
  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol>(
    preferences?.default_fasting_protocol || '16:8'
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(preferences?.unit_system || 'metric');

  // Expandable sections
  const [showGender, setShowGender] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showProtocols, setShowProtocols] = useState(false);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const [showHealthDisclaimer, setShowHealthDisclaimer] = useState(false);

  // Sync state when data loads
  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
    if (profile?.gender) setSelectedGender(profile.gender);
  }, [profile?.display_name, profile?.gender]);

  useEffect(() => {
    if (goals?.primary_goal) setSelectedGoal(goals.primary_goal);
  }, [goals?.primary_goal]);

  useEffect(() => {
    if (preferences?.default_fasting_protocol) setSelectedProtocol(preferences.default_fasting_protocol);
    if (preferences?.unit_system) setUnitSystem(preferences.unit_system);
  }, [preferences?.default_fasting_protocol, preferences?.unit_system]);

  const handleSaveProfile = () => {
    if (displayName !== profile?.display_name) {
      updateProfile.mutate({ display_name: displayName });
    }
  };

  const handleSelectGender = (gender: Gender) => {
    setSelectedGender(gender);
    setShowGender(false);
    if (gender !== profile?.gender) {
      updateProfile.mutate({ gender });
    }
  };

  const handleSelectGoal = (goal: GoalType) => {
    setSelectedGoal(goal);
    setShowGoals(false);
    if (goal !== goals?.primary_goal) {
      updateGoals.mutate({ primary_goal: goal });
    }
  };

  const handleSelectProtocol = (protocol: FastingProtocol) => {
    setSelectedProtocol(protocol);
    setShowProtocols(false);
    if (protocol !== preferences?.default_fasting_protocol) {
      updatePreferences.mutate({ default_fasting_protocol: protocol });
    }
  };

  const getGenderLabel = (value?: Gender) => GENDER_OPTIONS.find(g => g.value === value)?.label || 'Not set';
  const getGoalLabel = (value: GoalType) => GOALS.find(g => g.value === value)?.label || value;
  const getProtocolLabel = (value: FastingProtocol) => FASTING_PROTOCOLS.find(p => p.value === value)?.label || value;

  // Reset account for testing - creates a fresh anonymous identity
  const handleResetAccount = () => {
    Alert.alert(
      'Create New Test Account',
      'This will clear all local data and create a fresh anonymous account. Your current data will be lost. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              // Clear device ID to get a new identity
              await AsyncStorage.removeItem('deviceId');
              // Clear auth state
              clearAuth();
              // Clear onboarding status - must await before navigating
              await appStorage.setOnboardingCompleted(false);
              // Navigate to welcome screen
              router.replace('/(auth)/welcome');
            } catch (error) {
              console.error('Reset failed:', error);
              Alert.alert('Error', 'Failed to reset account. Please try again.');
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 50 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
      >
        {/* Header */}
      <XStack
        padding="$4"
        justifyContent="space-between"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Text fontSize="$5" fontWeight="bold" color="$color">
          Settings
        </Text>
        <Button
          size="$3"
          circular
          backgroundColor="$cardBackground"
          onPress={() => router.back()}
        >
          <X size={20} color={iconColor} weight="regular" />
        </Button>
      </XStack>

      <YStack padding="$4" gap="$4">
          {/* Profile Section */}
          <SettingsSection title="Profile">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$3">
              <YStack gap="$1">
                <Text fontSize="$3" color="$colorMuted">Display Name</Text>
                <XStack gap="$2" alignItems="center">
                  <Input
                    flex={1}
                    height={48}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                    backgroundColor="$backgroundHover"
                    borderWidth={0}
                    borderRadius="$3"
                    fontSize="$4"
                  />
                  <Button
                    size="$4"
                    width={48}
                    height={48}
                    borderRadius="$3"
                    backgroundColor="$primary"
                    pressStyle={{ scale: 0.95 }}
                    onPress={handleSaveProfile}
                    disabled={displayName === profile?.display_name}
                  >
                    <Check size={22} color="white" weight="thin" />
                  </Button>
                </XStack>
              </YStack>

              {/* Gender Selection */}
              <YStack gap="$2">
                <Text fontSize="$3" color="$colorMuted">Gender (for Coach Avatar)</Text>
                <Button
                  size="$4"
                  height={48}
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  justifyContent="space-between"
                  paddingHorizontal="$3"
                  onPress={() => setShowGender(!showGender)}
                >
                  <Text color="$color" fontWeight="500">{getGenderLabel(selectedGender)}</Text>
                  {showGender ? <CaretUp size={18} color={mutedIconColor} weight="regular" /> : <CaretDown size={18} color={mutedIconColor} weight="regular" />}
                </Button>

                {showGender && (
                  <YStack gap="$1" marginTop="$2">
                    {GENDER_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        size="$4"
                        height={44}
                        backgroundColor={selectedGender === option.value ? '$primary' : '$backgroundHover'}
                        borderRadius="$2"
                        justifyContent="flex-start"
                        paddingHorizontal="$3"
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => handleSelectGender(option.value)}
                      >
                        <XStack gap="$3" alignItems="center">
                          <option.Icon
                            size={20}
                            color={selectedGender === option.value ? 'white' : '#6b7280'}
                            weight="regular"
                          />
                          <Text
                            color={selectedGender === option.value ? 'white' : '$color'}
                            fontWeight={selectedGender === option.value ? '600' : '400'}
                          >
                            {option.label}
                          </Text>
                        </XStack>
                      </Button>
                    ))}
                  </YStack>
                )}
              </YStack>
            </YStack>
          </SettingsSection>

          {/* Notifications Section */}
          <SettingsSection title="Notifications">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$2">
              {/* Master toggle */}
              <XStack justifyContent="space-between" alignItems="center" opacity={isNotificationUpdating ? 0.6 : 1}>
                <YStack flex={1} marginRight="$3">
                  <Text fontSize="$4" fontWeight="600" color="$color">Push Notifications</Text>
                </YStack>
                <AppSwitch
                  disabled={isNotificationUpdating}
                  checked={notificationPrefs?.push_enabled ?? true}
                  onCheckedChange={(checked) => {
                    updateNotificationPrefs.mutate({ push_enabled: checked });
                  }}
                />
              </XStack>

              {/* Expandable details button */}
              <Button
                size="$3"
                height={40}
                backgroundColor="$backgroundHover"
                borderRadius="$3"
                justifyContent="space-between"
                paddingHorizontal="$3"
                onPress={() => setShowNotificationDetails(!showNotificationDetails)}
              >
                <Text fontSize="$3" color="$color">Customize Notifications</Text>
                {showNotificationDetails ? <CaretUp size={16} color={mutedIconColor} weight="regular" /> : <CaretDown size={16} color={mutedIconColor} weight="regular" />}
              </Button>

              {/* Expandable category toggles */}
              {showNotificationDetails && (
                <YStack gap="$2" opacity={!notificationPrefs?.push_enabled || isNotificationUpdating ? 0.5 : 1} paddingTop="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$3" color="$color">Fasting Reminders</Text>
                    <AppSwitch
                      disabled={!notificationPrefs?.push_enabled || isNotificationUpdating}
                      checked={notificationPrefs?.fasting_notifications ?? true}
                      onCheckedChange={(checked) => {
                        updateNotificationPrefs.mutate({ fasting_notifications: checked });
                      }}
                    />
                  </XStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$3" color="$color">Workout Reminders</Text>
                    <AppSwitch
                      disabled={!notificationPrefs?.push_enabled || isNotificationUpdating}
                      checked={notificationPrefs?.workout_notifications ?? true}
                      onCheckedChange={(checked) => {
                        updateNotificationPrefs.mutate({ workout_notifications: checked });
                      }}
                    />
                  </XStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$3" color="$color">Streak Alerts</Text>
                    <AppSwitch
                      disabled={!notificationPrefs?.push_enabled || isNotificationUpdating}
                      checked={notificationPrefs?.streak_notifications ?? true}
                      onCheckedChange={(checked) => {
                        updateNotificationPrefs.mutate({ streak_notifications: checked });
                      }}
                    />
                  </XStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$3" color="$color">Achievement Unlocks</Text>
                    <AppSwitch
                      disabled={!notificationPrefs?.push_enabled || isNotificationUpdating}
                      checked={notificationPrefs?.achievement_notifications ?? true}
                      onCheckedChange={(checked) => {
                        updateNotificationPrefs.mutate({ achievement_notifications: checked });
                      }}
                    />
                  </XStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$3" color="$color">Daily Motivation</Text>
                    <AppSwitch
                      disabled={!notificationPrefs?.push_enabled || isNotificationUpdating}
                      checked={notificationPrefs?.motivational_notifications ?? true}
                      onCheckedChange={(checked) => {
                        updateNotificationPrefs.mutate({ motivational_notifications: checked });
                      }}
                    />
                  </XStack>

                  {/* Quiet Hours */}
                  <YStack gap="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="$borderColor">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack>
                        <Text fontSize="$3" fontWeight="500" color="$color">Quiet Hours</Text>
                        <Text fontSize="$3" color="$colorMuted">10 PM - 7 AM</Text>
                      </YStack>
                      <AppSwitch
                        disabled={isNotificationUpdating}
                        checked={notificationPrefs?.quiet_hours_enabled ?? false}
                        onCheckedChange={(checked) => {
                          updateNotificationPrefs.mutate({ quiet_hours_enabled: checked });
                        }}
                      />
                    </XStack>
                  </YStack>
                </YStack>
              )}
            </YStack>
          </SettingsSection>

          {/* Health Data Section */}
          <SettingsSection title="Health Data">
            <YStack gap="$3">
              {/* Health Sync Card - Apple Health / Health Connect */}
              <HealthSyncCard />

              {/* Bloodwork Button */}
              <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder">
                <Button
                  size="$5"
                  height={56}
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  justifyContent="space-between"
                  paddingHorizontal="$4"
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => router.push('/(modals)/bloodwork')}
                >
                  <XStack alignItems="center" gap="$3">
                    <XStack
                      width={36}
                      height={36}
                      borderRadius="$3"
                      backgroundColor="$primary"
                      opacity={0.15}
                      position="absolute"
                    />
                    <XStack
                      width={36}
                      height={36}
                      borderRadius="$3"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <FileText size={18} color={primaryColor} weight="regular" />
                    </XStack>
                    <YStack>
                      <Text fontSize="$4" fontWeight="500" color="$color">Bloodwork</Text>
                      <Text fontSize="$3" color="$colorMuted">Upload lab results for AI analysis</Text>
                    </YStack>
                  </XStack>
                  <CaretRight size={18} color={mutedIconColor} weight="regular" />
                </Button>
              </YStack>
            </YStack>
          </SettingsSection>

          {/* Goals Section */}
          <SettingsSection title="Goals">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$2">
              <YStack gap="$2">
                <Text fontSize="$3" color="$colorMuted">Primary Goal</Text>
                <Button
                  size="$4"
                  height={48}
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  justifyContent="space-between"
                  paddingHorizontal="$3"
                  onPress={() => setShowGoals(!showGoals)}
                >
                  <Text color="$color" fontWeight="500">{getGoalLabel(selectedGoal)}</Text>
                  {showGoals ? <CaretUp size={18} color={mutedIconColor} weight="regular" /> : <CaretDown size={18} color={mutedIconColor} weight="regular" />}
                </Button>

                {showGoals && (
                  <YStack gap="$1" marginTop="$2">
                    {GOALS.map((goal) => (
                      <Button
                        key={goal.value}
                        size="$4"
                        height={44}
                        backgroundColor={selectedGoal === goal.value ? '$primary' : '$backgroundHover'}
                        borderRadius="$2"
                        justifyContent="flex-start"
                        paddingHorizontal="$3"
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => handleSelectGoal(goal.value)}
                      >
                        <Text
                          color={selectedGoal === goal.value ? 'white' : '$color'}
                          fontWeight={selectedGoal === goal.value ? '600' : '400'}
                        >
                          {goal.label}
                        </Text>
                      </Button>
                    ))}
                  </YStack>
                )}
              </YStack>
            </YStack>
          </SettingsSection>

          {/* Fasting Section */}
          <SettingsSection title="Fasting">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$2">
              <YStack gap="$2">
                <Text fontSize="$3" color="$colorMuted">Default Protocol</Text>
                <Button
                  size="$4"
                  height={48}
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  justifyContent="space-between"
                  paddingHorizontal="$3"
                  onPress={() => setShowProtocols(!showProtocols)}
                >
                  <Text color="$color" fontWeight="500">{getProtocolLabel(selectedProtocol)}</Text>
                  {showProtocols ? <CaretUp size={18} color={mutedIconColor} weight="regular" /> : <CaretDown size={18} color={mutedIconColor} weight="regular" />}
                </Button>

                {showProtocols && (
                  <YStack gap="$1" marginTop="$2">
                    {FASTING_PROTOCOLS.map((protocol) => (
                      <Button
                        key={protocol.value}
                        size="$4"
                        height={44}
                        backgroundColor={selectedProtocol === protocol.value ? '$primary' : '$backgroundHover'}
                        borderRadius="$2"
                        justifyContent="flex-start"
                        paddingHorizontal="$3"
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => handleSelectProtocol(protocol.value)}
                      >
                        <Text
                          color={selectedProtocol === protocol.value ? 'white' : '$color'}
                          fontWeight={selectedProtocol === protocol.value ? '600' : '400'}
                        >
                          {protocol.label}
                        </Text>
                      </Button>
                    ))}
                  </YStack>
                )}
              </YStack>
            </YStack>
          </SettingsSection>

          {/* Units Section */}
          <SettingsSection title="Units">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$2">
              <XStack gap="$2">
                <Button
                  flex={1}
                  size="$5"
                  height={48}
                  borderRadius="$3"
                  backgroundColor={unitSystem === 'metric' ? '$primary' : '$backgroundHover'}
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => {
                    setUnitSystem('metric');
                    updatePreferences.mutate({ unit_system: 'metric' });
                  }}
                >
                  <Text color={unitSystem === 'metric' ? 'white' : '$color'} fontWeight="600">
                    Metric (kg, cm)
                  </Text>
                </Button>
                <Button
                  flex={1}
                  size="$5"
                  height={48}
                  borderRadius="$3"
                  backgroundColor={unitSystem === 'imperial' ? '$primary' : '$backgroundHover'}
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => {
                    setUnitSystem('imperial');
                    updatePreferences.mutate({ unit_system: 'imperial' });
                  }}
                >
                  <Text color={unitSystem === 'imperial' ? 'white' : '$color'} fontWeight="600">
                    Imperial (lbs, in)
                  </Text>
                </Button>
              </XStack>
            </YStack>
          </SettingsSection>

          {/* Coach Personality */}
          <SettingsSection title="AI Coach">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$2">
              <Text fontSize="$3" color="$colorMuted">Coach Personality</Text>
              <YStack gap="$2">
                <XStack gap="$2">
                  {PERSONALITIES.slice(0, 2).map((p) => {
                    const Icon = PERSONALITY_ICONS[p.iconName];
                    const isSelected = coachPersonality === p.id;
                    return (
                      <Button
                        key={p.id}
                        flex={1}
                        size="$5"
                        height={48}
                        backgroundColor={isSelected ? '$primary' : '$backgroundHover'}
                        borderRadius="$3"
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => setCoachPersonality(p.id)}
                      >
                        <XStack gap="$2" alignItems="center">
                          <Icon size={20} color={isSelected ? 'white' : '#6b7280'} weight="fill" />
                          <Text
                            fontSize="$4"
                            color={isSelected ? 'white' : '$color'}
                            fontWeight={isSelected ? '600' : '400'}
                          >
                            {p.name}
                          </Text>
                        </XStack>
                      </Button>
                    );
                  })}
                </XStack>
                <XStack gap="$2">
                  {PERSONALITIES.slice(2, 4).map((p) => {
                    const Icon = PERSONALITY_ICONS[p.iconName];
                    const isSelected = coachPersonality === p.id;
                    return (
                      <Button
                        key={p.id}
                        flex={1}
                        size="$5"
                        height={48}
                        backgroundColor={isSelected ? '$primary' : '$backgroundHover'}
                        borderRadius="$3"
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => setCoachPersonality(p.id)}
                      >
                        <XStack gap="$2" alignItems="center">
                          <Icon size={20} color={isSelected ? 'white' : '#6b7280'} weight="fill" />
                          <Text
                            fontSize="$4"
                            color={isSelected ? 'white' : '$color'}
                            fontWeight={isSelected ? '600' : '400'}
                          >
                            {p.name}
                          </Text>
                        </XStack>
                      </Button>
                    );
                  })}
                </XStack>
              </YStack>
              <Text fontSize="$3" color="$colorMuted">
                {PERSONALITIES.find((p) => p.id === coachPersonality)?.description}
              </Text>
            </YStack>
          </SettingsSection>

          {/* Legal & Health Section */}
          <SettingsSection title="Legal & Health">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$3">
              {/* Health Disclaimer Button */}
              <Button
                size="$5"
                height={56}
                backgroundColor="$backgroundHover"
                borderRadius="$3"
                justifyContent="space-between"
                paddingHorizontal="$4"
                pressStyle={{ scale: 0.98 }}
                onPress={() => setShowHealthDisclaimer(!showHealthDisclaimer)}
              >
                <XStack alignItems="center" gap="$3">
                  <XStack
                    width={36}
                    height={36}
                    borderRadius="$3"
                    backgroundColor="#ef4444"
                    opacity={0.15}
                    position="absolute"
                  />
                  <XStack
                    width={36}
                    height={36}
                    borderRadius="$3"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <ShieldCheck size={18} color="#ef4444" weight="fill" />
                  </XStack>
                  <YStack>
                    <Text fontSize="$4" fontWeight="500" color="$color">Health Disclaimer</Text>
                    <Text fontSize="$3" color="$colorMuted">Important safety information</Text>
                  </YStack>
                </XStack>
                {showHealthDisclaimer ? (
                  <CaretUp size={18} color={mutedIconColor} weight="regular" />
                ) : (
                  <CaretDown size={18} color={mutedIconColor} weight="regular" />
                )}
              </Button>

              {/* Expanded Health Disclaimer */}
              {showHealthDisclaimer && (
                <YStack gap="$3" paddingTop="$2">
                  {/* What UGOKI is NOT */}
                  <YStack
                    backgroundColor="$background"
                    padding="$3"
                    borderRadius="$3"
                    borderLeftWidth={4}
                    borderLeftColor="#ef4444"
                  >
                    <Text fontWeight="700" fontSize="$3" color="$color" marginBottom="$2">
                      UGOKI is NOT:
                    </Text>
                    <YStack gap="$1">
                      <Text fontSize="$3" color="$colorMuted">• A medical device</Text>
                      <Text fontSize="$3" color="$colorMuted">• A substitute for professional medical advice</Text>
                      <Text fontSize="$3" color="$colorMuted">• Intended to diagnose, treat, cure, or prevent any disease</Text>
                      <Text fontSize="$3" color="$colorMuted">• Suitable for individuals with certain health conditions without medical supervision</Text>
                    </YStack>
                  </YStack>

                  {/* Consult Healthcare Provider */}
                  <YStack
                    backgroundColor="$background"
                    padding="$3"
                    borderRadius="$3"
                    borderLeftWidth={4}
                    borderLeftColor="#f97316"
                  >
                    <Text fontWeight="700" fontSize="$3" color="$color" marginBottom="$2">
                      Consult a healthcare provider before use if you:
                    </Text>
                    <YStack gap="$1">
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
                    backgroundColor="$background"
                    padding="$3"
                    borderRadius="$3"
                    borderLeftWidth={4}
                    borderLeftColor="#3b82f6"
                  >
                    <Text fontWeight="700" fontSize="$3" color="$color" marginBottom="$2">
                      AI Coach Limitations
                    </Text>
                    <Text fontSize="$3" color="$colorMuted" lineHeight={18}>
                      The AI Coach feature provides general wellness information only. It cannot and does not provide medical advice. Any information provided by the AI Coach should not be relied upon for medical decisions.
                    </Text>
                  </YStack>

                  {/* Safety Warning */}
                  <YStack
                    backgroundColor="#fef3c7"
                    padding="$3"
                    borderRadius="$3"
                  >
                    <XStack gap="$2" alignItems="center" marginBottom="$2">
                      <Warning size={18} color="#d97706" weight="fill" />
                      <Text fontWeight="700" fontSize="$3" color="#92400e">
                        Important
                      </Text>
                    </XStack>
                    <Text fontSize="$3" color="#78350f" lineHeight={18}>
                      If you experience any adverse health effects while using this app, discontinue use and consult a healthcare professional immediately.
                    </Text>
                  </YStack>
                </YStack>
              )}
            </YStack>
          </SettingsSection>

          {/* Developer Tools Section */}
          <SettingsSection title="Developer Tools">
            <YStack backgroundColor="$cardBackground" padding="$3" borderRadius="$3" borderWidth={1} borderColor="$cardBorder" gap="$3">
              {/* New Test Account Button */}
              <Button
                size="$5"
                height={56}
                backgroundColor="$backgroundHover"
                borderRadius="$3"
                justifyContent="space-between"
                paddingHorizontal="$4"
                pressStyle={{ scale: 0.98 }}
                onPress={handleResetAccount}
                disabled={isResetting}
                opacity={isResetting ? 0.6 : 1}
              >
                <XStack alignItems="center" gap="$3">
                  <XStack
                    width={36}
                    height={36}
                    borderRadius="$3"
                    backgroundColor="#8b5cf6"
                    opacity={0.15}
                    position="absolute"
                  />
                  <XStack
                    width={36}
                    height={36}
                    borderRadius="$3"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <UserPlus size={18} color="#8b5cf6" weight="fill" />
                  </XStack>
                  <YStack>
                    <Text fontSize="$4" fontWeight="500" color="$color">
                      {isResetting ? 'Resetting...' : 'New Test Account'}
                    </Text>
                    <Text fontSize="$3" color="$colorMuted">Create fresh anonymous identity</Text>
                  </YStack>
                </XStack>
                <CaretRight size={18} color={mutedIconColor} weight="regular" />
              </Button>

              <Text fontSize="$2" color="$colorMuted" paddingHorizontal="$2">
                For testing multiple users. Clears all local data and creates a new anonymous account.
              </Text>
            </YStack>
          </SettingsSection>

          {/* Bottom spacing */}
          <YStack height={20} />
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
