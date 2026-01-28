import { useEffect, useCallback, useState } from 'react';
import { YStack, XStack, Text, Button, Spinner, useTheme } from '@/shared/components/tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  X,
  Pause,
  Play,
  SkipForward,
  CheckCircle,
  Clock,
  Fire,
  Barbell,
} from 'phosphor-react-native';
import {
  useWorkout,
  useCompleteWorkout,
  useAbandonWorkout,
  useWorkoutPlayerStore,
} from '@/features/workouts';
import type { Exercise } from '@/features/workouts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function WorkoutPlayerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const iconColor = theme.color.val;
  const insets = useSafeAreaInsets();
  const { sessionId, workoutId } = useLocalSearchParams<{
    sessionId: string;
    workoutId: string;
  }>();

  const { data: workout, isLoading } = useWorkout(workoutId || '');
  const primaryColor = theme.primary.val;
  const secondaryColor = theme.secondary.val;

  const {
    phase,
    isPaused,
    exerciseTimeRemaining,
    currentExerciseIndex,
    caloriesBurned,
    initialize,
    start,
    pause,
    resume,
    skip,
    reset,
    tick,
    getCurrentExercise,
    getProgress,
  } = useWorkoutPlayerStore();

  const completeWorkout = useCompleteWorkout({
    onSuccess: () => {
      reset();
      router.replace('/(tabs)/workouts');
    },
    onError: (message) => {
      Alert.alert('Error', message);
    },
  });

  const abandonWorkout = useAbandonWorkout({
    onSuccess: () => {
      reset();
      router.back();
    },
    onError: (message) => {
      Alert.alert('Error', message);
    },
  });

  // Get current sessionId from store to prevent re-initialization
  const storeSessionId = useWorkoutPlayerStore((state) => state.sessionId);

  // Initialize workout - only if not already initialized with this session
  useEffect(() => {
    if (workout && sessionId && storeSessionId !== sessionId) {
      initialize(sessionId, workout);
    }
  }, [workout, sessionId, storeSessionId, initialize]);

  // Timer tick
  useEffect(() => {
    if (isPaused || phase === 'complete') return;

    const interval = setInterval(() => {
      tick();
    }, 100); // Tick every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [isPaused, phase, tick]);

  // Vibrate on phase change
  useEffect(() => {
    if (phase === 'exercise') {
      Vibration.vibrate(200);
    } else if (phase === 'rest') {
      Vibration.vibrate([0, 100, 100, 100]);
    } else if (phase === 'complete') {
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    }
  }, [phase]);

  const handleClose = () => {
    if (phase !== 'complete' && !isPaused) {
      pause();
    }

    Alert.alert(
      'End Workout?',
      'Your progress will be lost if you leave now.',
      [
        { text: 'Continue', style: 'cancel', onPress: resume },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: () => {
            if (sessionId) {
              abandonWorkout.mutate(sessionId);
            } else {
              reset();
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    if (sessionId && workout) {
      // Use workout estimate if store value is suspiciously low (< 10% of estimate)
      const finalCalories = caloriesBurned < workout.calories_estimate * 0.1
        ? workout.calories_estimate
        : Math.round(caloriesBurned);

      completeWorkout.mutate({
        sessionId,
        caloriesBurned: finalCalories,
      });
    }
  };

  const handlePlayPause = () => {
    if (isPaused) {
      if (phase === 'warmup' && exerciseTimeRemaining === 5) {
        start();
      } else {
        resume();
      }
    } else {
      pause();
    }
  };

  if (isLoading || !workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
          <Text color="$colorMuted" marginTop="$2">Loading workout...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  const currentExercise = getCurrentExercise();
  const progress = getProgress();

  // Completion screen
  if (phase === 'complete') {
    // Use workout estimate if store value is suspiciously low (< 10% of estimate)
    // This handles edge cases where calorie accumulation failed
    const displayCalories = caloriesBurned < workout.calories_estimate * 0.1
      ? workout.calories_estimate
      : Math.round(caloriesBurned);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <YStack flex={1} backgroundColor="$background" padding="$4">
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$6">
            <XStack
              width={120}
              height={120}
              borderRadius={60}
              backgroundColor="#22c55e"
              justifyContent="center"
              alignItems="center"
            >
              <CheckCircle size={64} color="white" weight="thin" />
            </XStack>

            <YStack alignItems="center" gap="$2">
              <Text fontSize="$8" fontWeight="bold" color="$color">
                Workout Complete!
              </Text>
              <Text fontSize="$4" color="$colorMuted">
                Great job finishing {workout.name}
              </Text>
            </YStack>

            {/* Stats */}
            <XStack gap="$6">
              <YStack alignItems="center" gap="$1">
                <XStack gap="$1" alignItems="center">
                  <Clock size={20} color={primaryColor} weight="regular" />
                  <Text fontSize="$6" fontWeight="bold" color="$color">
                    {workout.duration_minutes}
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$colorMuted">minutes</Text>
              </YStack>

              <YStack alignItems="center" gap="$1">
                <XStack gap="$1" alignItems="center">
                  <Fire size={20} color="#ef4444" weight="thin" />
                  <Text fontSize="$6" fontWeight="bold" color="$color">
                    {displayCalories}
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$colorMuted">calories</Text>
              </YStack>

              <YStack alignItems="center" gap="$1">
                <XStack gap="$1" alignItems="center">
                  <Barbell size={20} color={secondaryColor} weight="regular" />
                  <Text fontSize="$6" fontWeight="bold" color="$color">
                    {workout.exercises.length}
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$colorMuted">exercises</Text>
              </YStack>
            </XStack>
          </YStack>

          <Button
            size="$6"
            height={56}
            backgroundColor="$primary"
            borderRadius="$4"
            pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
            onPress={handleComplete}
            disabled={completeWorkout.isPending}
            marginBottom={Math.max(insets.bottom + 20, 40)}
          >
            {completeWorkout.isPending ? (
              <Spinner color="white" />
            ) : (
              <Text fontSize="$5" fontWeight="700" color="white">
                Done
              </Text>
            )}
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          padding="$4"
          justifyContent="space-between"
          alignItems="center"
        >
          <Button
            size="$3"
            circular
            backgroundColor="$cardBackground"
            onPress={handleClose}
          >
            <X size={20} color={iconColor} weight="regular" />
          </Button>

          <YStack alignItems="center">
            <Text fontSize="$3" color="$colorMuted">
              {workout.name}
            </Text>
            <Text fontSize="$3" color="$colorMuted">
              Exercise {progress.current} of {progress.total}
            </Text>
          </YStack>

          <Button
            size="$3"
            circular
            backgroundColor="$cardBackground"
            onPress={skip}
          >
            <SkipForward size={20} color={iconColor} weight="regular" />
          </Button>
        </XStack>

        {/* Main Content */}
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$5" paddingHorizontal="$4">
          {/* Phase Label */}
          <XStack
            backgroundColor={
              phase === 'warmup'
                ? '#f59e0b'
                : phase === 'rest'
                ? '#22c55e'
                : '$primary'
            }
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius="$6"
          >
            <Text fontSize="$4" fontWeight="bold" color="white" textTransform="uppercase">
              {phase === 'warmup' ? 'Get Ready' : phase === 'rest' ? 'Rest' : 'Exercise'}
            </Text>
          </XStack>

          {/* Timer Circle */}
          <TimerCircle
            timeRemaining={exerciseTimeRemaining}
            totalTime={
              phase === 'warmup'
                ? 5
                : phase === 'exercise'
                ? currentExercise?.duration_seconds || 30
                : currentExercise?.rest_seconds || 10
            }
            phase={phase}
          />

          {/* Exercise Name */}
          {phase !== 'warmup' && currentExercise && (
            <YStack alignItems="center" gap="$2">
              <Text
                fontSize="$7"
                fontWeight="bold"
                color="$color"
                textAlign="center"
              >
                {currentExercise.name}
              </Text>
              {currentExercise.description && (
                <Text
                  fontSize="$3"
                  color="$colorMuted"
                  textAlign="center"
                  numberOfLines={2}
                >
                  {currentExercise.description}
                </Text>
              )}
            </YStack>
          )}

          {/* Next Up */}
          {phase === 'rest' && (
            <YStack
              backgroundColor="$cardBackground"
              padding="$3"
              borderRadius="$3"
              alignItems="center"
            >
              <Text fontSize="$3" color="$colorMuted">
                Next Up
              </Text>
              <Text fontSize="$4" fontWeight="600" color="$color">
                {workout.exercises[currentExerciseIndex + 1]?.name || 'Complete!'}
              </Text>
            </YStack>
          )}

          {/* Play/Pause Button - in main content area */}
          <Button
            size="$6"
            height={60}
            width="100%"
            backgroundColor={isPaused ? '$primary' : 'white'}
            borderWidth={isPaused ? 0 : 2}
            borderColor={isPaused ? undefined : '$primary'}
            borderRadius="$4"
            pressStyle={{ scale: 0.97, opacity: 0.9 }}
            onPress={handlePlayPause}
            marginTop="$4"
          >
            <XStack gap="$2" alignItems="center" justifyContent="center" width="100%">
              {isPaused ? (
                <>
                  <Play size={24} color="white" weight="fill" />
                  <Text fontSize="$5" fontWeight="700" color="white">
                    {phase === 'warmup' && exerciseTimeRemaining === 5 ? 'Start' : 'Resume'}
                  </Text>
                </>
              ) : (
                <>
                  <Pause size={24} color="#14b8a6" weight="fill" />
                  <Text fontSize="$5" fontWeight="700" color="#14b8a6">
                    Pause
                  </Text>
                </>
              )}
            </XStack>
          </Button>

          {/* Progress Bar - below button */}
          <YStack gap="$2" width="100%">
            <XStack justifyContent="space-between">
              <Text fontSize="$3" color="$colorMuted">
                Progress
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                {Math.round(progress.percent)}%
              </Text>
            </XStack>
            <YStack height={4} backgroundColor="$backgroundHover" borderRadius="$2">
              <YStack
                height={4}
                backgroundColor="$primary"
                borderRadius="$2"
                width={`${progress.percent}%`}
              />
            </YStack>
          </YStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}

// Timer Circle Component
function TimerCircle({
  timeRemaining,
  totalTime,
  phase,
}: {
  timeRemaining: number;
  totalTime: number;
  phase: string;
}) {
  const size = 240;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useSharedValue(1);

  useEffect(() => {
    const targetProgress = totalTime > 0 ? timeRemaining / totalTime : 0;
    progress.value = withTiming(targetProgress, {
      duration: 100,
      easing: Easing.linear,
    });
  }, [timeRemaining, totalTime]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const getColor = () => {
    if (phase === 'warmup') return '#f59e0b';
    if (phase === 'rest') return '#22c55e';
    return '#f97316'; // primary/exercise
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}`;
  };

  return (
    <YStack alignItems="center" justifyContent="center">
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#333"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Timer text */}
      <YStack position="absolute" alignItems="center">
        <Text
          fontSize={60}
          fontWeight="bold"
          color="$color"
          fontFamily="$mono"
        >
          {formatTime(timeRemaining)}
        </Text>
        <Text fontSize="$3" color="$colorMuted">
          {phase === 'warmup' ? 'seconds' : phase === 'rest' ? 'rest' : 'remaining'}
        </Text>
      </YStack>
    </YStack>
  );
}
