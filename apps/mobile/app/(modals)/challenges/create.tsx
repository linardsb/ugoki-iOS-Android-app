/**
 * Create Challenge Screen
 * Form to create a new challenge
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Warning } from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import { useCreateChallenge } from '@/features/social/hooks';
import type { ChallengeType } from '@/features/social/types';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_UNITS } from '@/features/social/types';

const CHALLENGE_TYPES: { value: ChallengeType; label: string; description: string }[] = [
  {
    value: 'fasting_streak',
    label: 'Fasting Streak',
    description: 'Compete for the longest fasting streak',
  },
  {
    value: 'workout_count',
    label: 'Workout Count',
    description: 'Complete the most workouts',
  },
  {
    value: 'total_xp',
    label: 'Total XP',
    description: 'Earn the most experience points',
  },
  {
    value: 'consistency',
    label: 'Consistency',
    description: 'Log activity on the most days',
  },
];

// Fasting Safety Warning Component
const FastingSafetyWarning = () => (
  <XStack
    backgroundColor="$warningSubtle"
    borderRadius="$3"
    padding="$3"
    borderWidth={1}
    borderColor="$warning"
    gap="$2"
    alignItems="flex-start"
    marginTop="$2"
  >
    <Warning size={20} color="#ca8a04" weight="fill" />
    <YStack flex={1} gap="$1">
      <Text fontSize={13} fontWeight="600" color="$warning">
        Health Notice
      </Text>
      <Text fontSize={12} color="$warning" lineHeight={16}>
        For experienced fasters only. Not suitable if you have diabetes, eating disorders, are pregnant/breastfeeding, or have medical conditions. Consult your doctor first.
      </Text>
    </YStack>
  </XStack>
);

export default function CreateChallengeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createChallenge = useCreateChallenge();

  // Theme-aware colors from design tokens
  const backgroundColor = theme.background.val;
  const cardBackground = theme.cardBackground.val;
  const inputBackground = theme.backgroundHover.val;
  const borderColor = theme.borderColor.val;
  const cardBorderColor = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const placeholderColor = theme.colorSubtle.val;
  const selectedBg = theme.successSubtle.val;
  const primaryColor = theme.primary.val;
  const warningColor = theme.warning.val;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('fasting_streak');
  const [goalValue, setGoalValue] = useState('3'); // Default 3 days for fasting safety
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [isPublic, setIsPublic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('50');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const unit = CHALLENGE_TYPE_UNITS[challengeType];

  // Handle challenge type change with safe defaults
  const handleChallengeTypeChange = (type: ChallengeType) => {
    setChallengeType(type);
    // Set safe default goal values per type
    if (type === 'fasting_streak') {
      setGoalValue('3'); // Max 3 days default for fasting safety
    } else if (type === 'workout_count') {
      setGoalValue('7');
    } else if (type === 'total_xp') {
      setGoalValue('1000');
    } else if (type === 'consistency') {
      setGoalValue('7');
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a challenge name');
      return;
    }

    if (!goalValue || parseFloat(goalValue) <= 0) {
      Alert.alert('Error', 'Please enter a valid goal value');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    createChallenge.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        challenge_type: challengeType,
        goal_value: parseFloat(goalValue),
        goal_unit: unit,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_public: isPublic,
        max_participants: parseInt(maxParticipants) || 50,
      },
      {
        onSuccess: (challenge) => {
          Alert.alert(
            'Challenge Created!',
            `Share the code "${challenge.join_code}" with friends to invite them.`,
            [{ text: 'OK', onPress: () => router.replace(`/challenges/${challenge.id}`) }]
          );
        },
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to create challenge');
        },
      }
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader title="Create Challenge" showClose />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$4">
          {/* Name */}
          <YStack gap="$2">
            <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
              Challenge Name
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: cardBorderColor, color: textColor }]}
              placeholder="e.g., 7-Day Fasting Challenge"
              placeholderTextColor={placeholderColor}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
          </YStack>

          {/* Description */}
          <YStack gap="$2">
            <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
              Description (optional)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: inputBackground, borderColor: cardBorderColor, color: textColor }]}
              placeholder="What is this challenge about?"
              placeholderTextColor={placeholderColor}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </YStack>

          {/* Challenge Type */}
          <YStack gap="$2">
            <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
              Challenge Type
            </Text>
            <YStack gap="$2">
              {CHALLENGE_TYPES.map((type) => (
                <React.Fragment key={type.value}>
                  <TouchableOpacity
                    onPress={() => handleChallengeTypeChange(type.value)}
                    activeOpacity={0.7}
                  >
                    <XStack
                      backgroundColor={challengeType === type.value ? selectedBg : cardBackground}
                      borderRadius="$3"
                      padding="$3"
                      borderWidth={challengeType === type.value ? 2 : 1}
                      borderColor={challengeType === type.value ? '#14b8a6' : cardBorderColor}
                      alignItems="center"
                    >
                      <YStack flex={1}>
                        <Text fontSize={15} fontWeight="600" style={{ color: textColor }}>
                          {type.label}
                        </Text>
                        <Text fontSize={13} style={{ color: mutedColor }}>
                          {type.description}
                        </Text>
                      </YStack>
                    </XStack>
                  </TouchableOpacity>
                  {/* Show warning right after Fasting Streak when selected */}
                  {type.value === 'fasting_streak' && challengeType === 'fasting_streak' && (
                    <FastingSafetyWarning />
                  )}
                </React.Fragment>
              ))}
            </YStack>
          </YStack>

          {/* Goal Value */}
          <YStack gap="$2">
            <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
              Goal ({unit})
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: cardBorderColor, color: textColor }]}
              placeholder="e.g., 7"
              placeholderTextColor={placeholderColor}
              value={goalValue}
              onChangeText={setGoalValue}
              keyboardType="numeric"
            />
          </YStack>

          {/* Dates */}
          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
                Start Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowStartPicker(true)}
                style={[styles.dateButton, { backgroundColor: inputBackground, borderColor: cardBorderColor }]}
              >
                <Text fontSize={15} style={{ color: textColor }}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
            </YStack>

            <YStack flex={1} gap="$2">
              <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
                End Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                style={[styles.dateButton, { backgroundColor: inputBackground, borderColor: cardBorderColor }]}
              >
                <Text fontSize={15} style={{ color: textColor }}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </YStack>
          </XStack>

          {/* Date Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (date) setStartDate(date);
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={startDate}
              onChange={(event, date) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (date) setEndDate(date);
              }}
            />
          )}

          {/* Max Participants */}
          <YStack gap="$2">
            <Text fontSize={14} fontWeight="600" style={{ color: textColor }}>
              Max Participants
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: cardBorderColor, color: textColor }]}
              placeholder="50"
              placeholderTextColor={placeholderColor}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
            />
          </YStack>

          {/* Public Toggle */}
          <TouchableOpacity onPress={() => setIsPublic(!isPublic)} activeOpacity={0.7}>
            <XStack
              backgroundColor={cardBackground}
              borderRadius="$3"
              padding="$4"
              justifyContent="space-between"
              alignItems="center"
              borderWidth={1}
              borderColor={cardBorderColor}
            >
              <YStack flex={1}>
                <Text fontSize={15} fontWeight="600" style={{ color: textColor }}>
                  Public Challenge
                </Text>
                <Text fontSize={13} style={{ color: mutedColor }}>
                  Anyone can find and join this challenge
                </Text>
              </YStack>
              <View style={[styles.toggle, isPublic && styles.toggleActive]}>
                <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
              </View>
            </XStack>
          </TouchableOpacity>
        </YStack>
      </ScrollView>

      {/* Create Button */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16, backgroundColor, borderTopColor: borderColor }]}>
        <TouchableOpacity
          onPress={handleCreate}
          style={styles.createButton}
          disabled={createChallenge.isPending}
        >
          <Text color="white" fontWeight="700" fontSize={16}>
            {createChallenge.isPending ? 'Creating...' : 'Create Challenge'}
          </Text>
        </TouchableOpacity>
      </View>
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
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3c3c3e',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#14b8a6',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  toggleThumbActive: {
    marginLeft: 22,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  createButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
