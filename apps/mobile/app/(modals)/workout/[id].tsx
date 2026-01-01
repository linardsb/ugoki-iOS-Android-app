import { YStack, XStack, Text, ScrollView, Button, Spinner, useTheme } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import {
  X,
  Clock,
  Fire,
  Barbell,
  Play,
  CaretRight,
  Lightning,
} from 'phosphor-react-native';
import { useWorkout, useStartWorkout } from '@/features/workouts';
import type { DifficultyLevel, WorkoutType, Exercise } from '@/features/workouts';

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const workoutTypeLabels: Record<WorkoutType, string> = {
  hiit: 'HIIT',
  strength: 'Strength',
  cardio: 'Cardio',
  flexibility: 'Flexibility',
  recovery: 'Recovery',
};

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedIconColor = theme.colorMuted.val;

  const { data: workout, isLoading, error } = useWorkout(id);
  const startWorkout = useStartWorkout({
    onSuccess: (session) => {
      // Navigate to workout player
      router.replace({
        pathname: '/(modals)/workout-player',
        params: { sessionId: session.id, workoutId: id },
      });
    },
    onError: (message) => {
      Alert.alert('Error', message);
    },
  });

  const handleClose = () => {
    router.back();
  };

  const handleStartWorkout = () => {
    if (id) {
      startWorkout.mutate(id);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const calculateTotalDuration = (exercises: Exercise[]) => {
    const totalSeconds = exercises.reduce(
      (sum, ex) => sum + ex.duration_seconds + ex.rest_seconds,
      0
    );
    return Math.ceil(totalSeconds / 60);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
          <Text color="$colorMuted" marginTop="$2">Loading workout...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (error || !workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" padding="$4">
          <XStack justifyContent="flex-end">
            <Button
              size="$3"
              circular
              backgroundColor="$cardBackground"
              onPress={handleClose}
            >
              <X size={20} color={iconColor} weight="regular" />
            </Button>
          </XStack>
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
            <Text fontSize="$5" color="$color">Workout not found</Text>
            <Button onPress={handleClose}>Go Back</Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    );
  }

  const difficultyColor = difficultyColors[workout.difficulty];
  const exercisesDuration = calculateTotalDuration(workout.exercises);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
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
            Workout Details
          </Text>
          <Button
            size="$3"
            circular
            backgroundColor="$cardBackground"
            onPress={handleClose}
          >
            <X size={20} color={iconColor} weight="regular" />
          </Button>
        </XStack>

        <ScrollView flex={1}>
          <YStack padding="$4" gap="$5">
            {/* Hero Section */}
            <YStack
              height={200}
              backgroundColor="$secondary"
              borderRadius="$4"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
            >
              <Lightning size={64} color="white" weight="thin" />
            </YStack>

            {/* Title & Badges */}
            <YStack gap="$2">
              <Text fontSize="$7" fontWeight="bold" color="$color">
                {workout.name}
              </Text>

              <XStack gap="$2" flexWrap="wrap">
                <XStack
                  backgroundColor={`${difficultyColor}20`}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text
                    fontSize="$3"
                    color={difficultyColor}
                    fontWeight="600"
                    textTransform="capitalize"
                  >
                    {workout.difficulty}
                  </Text>
                </XStack>
                <XStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$3" color="$colorMuted">
                    {workoutTypeLabels[workout.workout_type]}
                  </Text>
                </XStack>
                {workout.is_featured && (
                  <XStack
                    backgroundColor="$primary"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$2"
                  >
                    <Text fontSize="$3" color="white" fontWeight="600">
                      Featured
                    </Text>
                  </XStack>
                )}
              </XStack>
            </YStack>

            {/* Stats Row */}
            <XStack gap="$4" justifyContent="space-around">
              <YStack alignItems="center" gap="$1">
                <XStack
                  width={48}
                  height={48}
                  borderRadius="$6"
                  backgroundColor="$primary"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Clock size={24} color="white" weight="thin" />
                </XStack>
                <Text fontSize="$4" fontWeight="bold" color="$color">
                  {workout.duration_minutes}
                </Text>
                <Text fontSize="$3" color="$colorMuted">minutes</Text>
              </YStack>

              <YStack alignItems="center" gap="$1">
                <XStack
                  width={48}
                  height={48}
                  borderRadius="$6"
                  backgroundColor="#ef4444"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Fire size={24} color="white" weight="thin" />
                </XStack>
                <Text fontSize="$4" fontWeight="bold" color="$color">
                  {workout.calories_estimate}
                </Text>
                <Text fontSize="$3" color="$colorMuted">calories</Text>
              </YStack>

              <YStack alignItems="center" gap="$1">
                <XStack
                  width={48}
                  height={48}
                  borderRadius="$6"
                  backgroundColor="$secondary"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Barbell size={24} color="white" weight="thin" />
                </XStack>
                <Text fontSize="$4" fontWeight="bold" color="$color">
                  {workout.exercises.length}
                </Text>
                <Text fontSize="$3" color="$colorMuted">exercises</Text>
              </YStack>
            </XStack>

            {/* Description */}
            {workout.description && (
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  About
                </Text>
                <Text fontSize="$3" color="$colorMuted" lineHeight={22}>
                  {workout.description}
                </Text>
              </YStack>
            )}

            {/* Equipment */}
            {workout.equipment_needed.length > 0 && (
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Equipment Needed
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {workout.equipment_needed.map((item) => (
                    <XStack
                      key={item}
                      backgroundColor="$cardBackground"
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius="$3"
                    >
                      <Text fontSize="$3" color="$color" textTransform="capitalize">
                        {item}
                      </Text>
                    </XStack>
                  ))}
                </XStack>
              </YStack>
            )}

            {/* Exercises */}
            {workout.exercises.length > 0 && (
              <YStack gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Exercises
                  </Text>
                  <Text fontSize="$3" color="$colorMuted">
                    ~{exercisesDuration} min total
                  </Text>
                </XStack>

                <YStack gap="$2">
                  {workout.exercises.map((exercise, index) => (
                    <ExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                    />
                  ))}
                </YStack>
              </YStack>
            )}

            {/* Start Button - inside scroll */}
            <YStack paddingTop="$4" paddingBottom={80}>
              <Button
                size="$6"
                height={56}
                backgroundColor="$primary"
                borderRadius="$4"
                pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
                onPress={handleStartWorkout}
                disabled={startWorkout.isPending}
              >
                {startWorkout.isPending ? (
                  <Spinner color="white" />
                ) : (
                  <XStack gap="$2" alignItems="center">
                    <Play size={22} color="white" weight="fill" />
                    <Text fontSize="$5" fontWeight="700" color="white">
                      Start Workout
                    </Text>
                  </XStack>
                )}
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}

function ExerciseItem({ exercise, index }: { exercise: Exercise; index: number }) {
  const theme = useTheme();
  const primaryColor = theme.primary.val;
  const mutedIconColor = theme.colorMuted.val;
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <XStack
      backgroundColor="$cardBackground"
      padding="$3"
      borderRadius="$3"
      gap="$3"
      alignItems="center"
    >
      {/* Order number */}
      <XStack
        width={32}
        height={32}
        borderRadius="$6"
        backgroundColor="$backgroundHover"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="$3" fontWeight="bold" color="$colorMuted">
          {index + 1}
        </Text>
      </XStack>

      {/* Exercise info */}
      <YStack flex={1} gap="$1">
        <Text fontSize="$3" fontWeight="600" color="$color">
          {exercise.name}
        </Text>
        <XStack gap="$2" alignItems="center">
          <XStack gap="$1" alignItems="center">
            <Clock size={12} color={primaryColor} weight="regular" />
            <Text fontSize="$3" color="$colorMuted">
              {formatTime(exercise.duration_seconds)}
            </Text>
          </XStack>
          {exercise.rest_seconds > 0 && (
            <>
              <Text color="$colorMuted">·</Text>
              <Text fontSize="$3" color="$colorMuted">
                {formatTime(exercise.rest_seconds)} rest
              </Text>
            </>
          )}
        </XStack>
      </YStack>

      <CaretRight size={16} color={mutedIconColor} weight="regular" />
    </XStack>
  );
}
