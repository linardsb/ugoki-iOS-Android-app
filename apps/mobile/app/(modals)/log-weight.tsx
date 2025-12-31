import { useState } from 'react';
import { YStack, XStack, Text, Button, Input } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Scales, TrendDown, TrendUp, Minus } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useLogWeight, useLatestWeight, useWeightTrend } from '@/features/dashboard';
import { usePreferences } from '@/features/profile';

export default function LogWeightScreen() {
  const router = useRouter();
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');

  const { data: preferences } = usePreferences();
  const { data: latestWeight } = useLatestWeight();
  const { data: weightTrend } = useWeightTrend();

  const isImperial = preferences?.unit_system === 'imperial';
  const unit = isImperial ? 'lbs' : 'kg';

  const logWeight = useLogWeight({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Weight logged successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error);
    },
  });

  const handleSave = () => {
    const weightValue = parseFloat(weight);

    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight value.');
      return;
    }

    // Convert to kg if imperial
    const weightInKg = isImperial ? weightValue * 0.453592 : weightValue;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logWeight.mutate({
      value: weightInKg,
      note: note.trim() || undefined,
    });
  };

  const handleClose = () => {
    router.back();
  };

  // Format weight for display
  const formatWeight = (valueKg: number | undefined) => {
    if (!valueKg) return '--';
    const value = isImperial ? valueKg * 2.20462 : valueKg;
    return value.toFixed(1);
  };

  // Get trend icon
  const getTrendIcon = () => {
    if (!weightTrend) return <Minus size={16} color="$colorMuted" weight="thin" />;
    if (weightTrend.direction === 'down') return <TrendDown size={16} color="#22c55e" weight="thin" />;
    if (weightTrend.direction === 'up') return <TrendUp size={16} color="#ef4444" weight="thin" />;
    return <Minus size={16} color="$colorMuted" weight="thin" />;
  };

  const getTrendText = () => {
    if (!weightTrend) return 'No trend data';
    const change = isImperial ? weightTrend.change_absolute * 2.20462 : weightTrend.change_absolute;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)} ${unit} this week`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack flex={1} backgroundColor="$background">
          {/* Header */}
          <XStack
            padding="$4"
            justifyContent="space-between"
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <Text fontSize="$5" fontWeight="bold" color="$color">
              Log Weight
            </Text>
            <Button
              size="$3"
              circular
              backgroundColor="$cardBackground"
              onPress={handleClose}
            >
              <X size={20} color="$color" weight="thin" />
            </Button>
          </XStack>

          <YStack padding="$4" gap="$5">
            {/* Current Stats */}
            <XStack gap="$3">
              <YStack
                flex={1}
                backgroundColor="$cardBackground"
                padding="$3"
                borderRadius="$3"
                gap="$1"
              >
                <XStack gap="$2" alignItems="center">
                  <Scales size={16} color="$primary" weight="thin" />
                  <Text fontSize="$3" color="$colorMuted">Current</Text>
                </XStack>
                <Text fontSize="$5" fontWeight="bold" color="$color">
                  {formatWeight(latestWeight?.value)} {unit}
                </Text>
              </YStack>

              <YStack
                flex={1}
                backgroundColor="$cardBackground"
                padding="$3"
                borderRadius="$3"
                gap="$1"
              >
                <XStack gap="$2" alignItems="center">
                  {getTrendIcon()}
                  <Text fontSize="$3" color="$colorMuted">Trend</Text>
                </XStack>
                <Text fontSize="$3" fontWeight="600" color="$color">
                  {getTrendText()}
                </Text>
              </YStack>
            </XStack>

            {/* Weight Input */}
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$color">
                Enter Weight
              </Text>
              <XStack
                backgroundColor="$cardBackground"
                borderRadius="$4"
                padding="$1"
                alignItems="center"
              >
                <Input
                  flex={1}
                  height={60}
                  backgroundColor="transparent"
                  borderWidth={0}
                  fontSize={32}
                  fontWeight="bold"
                  textAlign="center"
                  placeholder="0.0"
                  placeholderTextColor="$colorMuted"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
                <YStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                  borderRadius="$3"
                  marginRight="$2"
                >
                  <Text fontSize="$4" fontWeight="600" color="$colorMuted">
                    {unit}
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            {/* Note Input */}
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$color">
                Note (optional)
              </Text>
              <Input
                height={48}
                backgroundColor="$cardBackground"
                borderWidth={0}
                borderRadius="$3"
                paddingHorizontal="$3"
                placeholder="Add a note..."
                placeholderTextColor="$colorMuted"
                value={note}
                onChangeText={setNote}
              />
            </YStack>

            {/* Quick Suggestions */}
            {latestWeight && (
              <YStack gap="$2">
                <Text fontSize="$3" color="$colorMuted">Quick entry</Text>
                <XStack gap="$2" flexWrap="wrap">
                  {[-0.5, 0, 0.5].map((diff) => {
                    const baseValue = isImperial
                      ? latestWeight.value * 2.20462
                      : latestWeight.value;
                    const suggestedValue = baseValue + diff;
                    return (
                      <Button
                        key={diff}
                        size="$3"
                        height={40}
                        backgroundColor="$backgroundHover"
                        borderRadius="$3"
                        pressStyle={{ scale: 0.98 }}
                        onPress={() => setWeight(suggestedValue.toFixed(1))}
                      >
                        <Text color="$color" fontWeight="500">
                          {suggestedValue.toFixed(1)} {unit}
                        </Text>
                      </Button>
                    );
                  })}
                </XStack>
              </YStack>
            )}

            {/* Save Button */}
            <Button
              size="$6"
              height={56}
              backgroundColor={weight ? '$primary' : '$backgroundHover'}
              borderRadius="$4"
              pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
              onPress={handleSave}
              disabled={!weight || logWeight.isPending}
              marginTop="$4"
            >
              <Text
                color={weight ? 'white' : '$colorMuted'}
                fontWeight="700"
                fontSize="$5"
              >
                {logWeight.isPending ? 'Saving...' : 'Save Weight'}
              </Text>
            </Button>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
