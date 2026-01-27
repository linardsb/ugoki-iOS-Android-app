import { useState, useMemo } from 'react';
import { YStack, XStack, Text, ScrollView, Button, Spinner, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Trophy,
  Fire,
  Timer,
  Barbell,
  Scales,
  Star,
  Crown,
  Rocket,
  Medal,
  TrendUp,
  Lock,
  Check,
} from 'phosphor-react-native';
import { useAchievements } from '@/features/dashboard';
import type { UserAchievement, AchievementType } from '@/features/dashboard';

type FilterType = 'all' | AchievementType;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'streak', label: 'Streak' },
  { key: 'fasting', label: 'Fasting' },
  { key: 'workout', label: 'Workout' },
  { key: 'weight', label: 'Weight' },
  { key: 'special', label: 'Special' },
];


// Map icon names to Phosphor icons
function getIconComponent(iconName: string | undefined, size: number, color: string) {
  switch (iconName) {
    case 'flame':
      return <Fire size={size} color={color} weight="thin" />;
    case 'trophy':
      return <Trophy size={size} color={color} weight="thin" />;
    case 'crown':
      return <Crown size={size} color={color} weight="thin" />;
    case 'timer':
      return <Timer size={size} color={color} weight="thin" />;
    case 'star':
      return <Star size={size} color={color} weight="thin" />;
    case 'dumbbell':
    case 'muscle':
      return <Barbell size={size} color={color} weight="thin" />;
    case 'medal':
      return <Medal size={size} color={color} weight="thin" />;
    case 'scale':
      return <Scales size={size} color={color} weight="thin" />;
    case 'chart':
      return <TrendUp size={size} color={color} weight="thin" />;
    case 'rocket':
      return <Rocket size={size} color={color} weight="thin" />;
    default:
      return <Trophy size={size} color={color} weight="thin" />;
  }
}

export default function AchievementsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const backgroundColor = theme.background.val;
  const iconColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: achievements, isLoading } = useAchievements(false);

  const handleClose = () => {
    router.back();
  };

  // Filter and sort achievements
  const filteredAchievements = useMemo(() => {
    if (!achievements) return [];

    let filtered = achievements;

    // Filter by category
    if (filter !== 'all') {
      filtered = filtered.filter((a) => a.achievement.achievement_type === filter);
    }

    // Sort: unlocked first, then by progress, then alphabetically
    return filtered.sort((a, b) => {
      // Unlocked achievements first
      if (a.is_unlocked && !b.is_unlocked) return -1;
      if (!a.is_unlocked && b.is_unlocked) return 1;

      // For locked, sort by progress (higher first)
      if (!a.is_unlocked && !b.is_unlocked) {
        const progressA = a.progress / a.achievement.requirement_value;
        const progressB = b.progress / b.achievement.requirement_value;
        if (progressA !== progressB) return progressB - progressA;
      }

      // Then by XP reward (higher first)
      return b.achievement.xp_reward - a.achievement.xp_reward;
    });
  }, [achievements, filter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!achievements) return { unlocked: 0, total: 0, xpEarned: 0 };

    const unlocked = achievements.filter((a) => a.is_unlocked).length;
    const xpEarned = achievements
      .filter((a) => a.is_unlocked)
      .reduce((sum, a) => sum + a.achievement.xp_reward, 0);

    return {
      unlocked,
      total: achievements.length,
      xpEarned,
    };
  }, [achievements]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
          <Text color="$colorMuted" marginTop="$2">Loading achievements...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          padding="$4"
          justifyContent="space-between"
          alignItems="center"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <YStack>
            <Text fontSize="$6" fontWeight="bold" color="$color">
              Achievements
            </Text>
            <Text fontSize="$3" color="$colorMuted">
              {stats.unlocked} of {stats.total} unlocked
            </Text>
          </YStack>
          <Button
            size="$3"
            circular
            backgroundColor="$cardBackground"
            onPress={handleClose}
          >
            <X size={20} color={iconColor} weight="regular" />
          </Button>
        </XStack>

        {/* Stats Summary */}
        <XStack padding="$4" gap="$4" justifyContent="center">
          <YStack
            flex={1}
            backgroundColor="$cardBackground"
            padding="$3"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$cardBorder"
            alignItems="center"
          >
            <Trophy size={24} color={mutedColor} weight="regular" />
            <Text fontSize="$5" fontWeight="bold" color="$color" marginTop="$1">
              {stats.unlocked}
            </Text>
            <Text fontSize="$3" color="$colorMuted">
              Unlocked
            </Text>
          </YStack>
          <YStack
            flex={1}
            backgroundColor="$cardBackground"
            padding="$3"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$cardBorder"
            alignItems="center"
          >
            <Star size={24} color={mutedColor} weight="regular" />
            <Text fontSize="$5" fontWeight="bold" color="$color" marginTop="$1">
              {stats.xpEarned.toLocaleString()}
            </Text>
            <Text fontSize="$3" color="$colorMuted">
              XP Earned
            </Text>
          </YStack>
        </XStack>

        {/* Category Filters - 2 rows of 3 */}
        <YStack paddingHorizontal="$4" paddingVertical="$3" gap="$2">
          <XStack gap="$2">
            {FILTERS.slice(0, 3).map((f) => (
              <XStack
                key={f.key}
                flex={1}
                height={40}
                backgroundColor={filter === f.key ? '$primary' : '$cardBackground'}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.8, scale: 0.97 }}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  fontSize={14}
                  fontWeight="600"
                  color={filter === f.key ? 'white' : '$colorMuted'}
                >
                  {f.label}
                </Text>
              </XStack>
            ))}
          </XStack>
          <XStack gap="$2">
            {FILTERS.slice(3, 6).map((f) => (
              <XStack
                key={f.key}
                flex={1}
                height={40}
                backgroundColor={filter === f.key ? '$primary' : '$cardBackground'}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.8, scale: 0.97 }}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  fontSize={14}
                  fontWeight="600"
                  color={filter === f.key ? 'white' : '$colorMuted'}
                >
                  {f.label}
                </Text>
              </XStack>
            ))}
          </XStack>
        </YStack>

        {/* Achievements Grid */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <YStack gap="$3">
            {filteredAchievements.map((userAchievement) => (
              <AchievementCard
                key={userAchievement.id}
                userAchievement={userAchievement}
              />
            ))}

            {filteredAchievements.length === 0 && (
              <YStack alignItems="center" padding="$6">
                <Trophy size={48} color={mutedColor} weight="regular" />
                <Text fontSize="$4" color="$colorMuted" marginTop="$3">
                  No achievements in this category
                </Text>
              </YStack>
            )}
          </YStack>

          {/* Bottom padding */}
          <YStack height={40} />
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}

function AchievementCard({ userAchievement }: { userAchievement: UserAchievement }) {
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const primaryColor = theme.primary.val;
  const { achievement, is_unlocked, progress, unlocked_at } = userAchievement;
  const progressPercent = Math.min(100, (progress / achievement.requirement_value) * 100);

  // Don't show hidden achievements unless unlocked
  if (achievement.is_hidden && !is_unlocked) {
    return (
      <XStack
        backgroundColor="$cardBackground"
        padding="$4"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$cardBorder"
        alignItems="center"
        gap="$3"
        opacity={0.5}
      >
        <XStack
          width={48}
          height={48}
          borderRadius={24}
          backgroundColor="$backgroundHover"
          justifyContent="center"
          alignItems="center"
        >
          <Lock size={24} color={mutedColor} weight="regular" />
        </XStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color="$colorMuted">
            Hidden Achievement
          </Text>
          <Text fontSize="$3" color="$colorMuted">
            Keep going to discover this achievement
          </Text>
        </YStack>
      </XStack>
    );
  }

  return (
    <XStack
      backgroundColor="$cardBackground"
      padding="$4"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$cardBorder"
      alignItems="center"
      gap="$3"
      opacity={is_unlocked ? 1 : 0.8}
    >
      {/* Icon */}
      <XStack
        width={48}
        height={48}
        borderRadius={24}
        backgroundColor="$backgroundHover"
        justifyContent="center"
        alignItems="center"
        position="relative"
      >
        {getIconComponent(
          achievement.icon,
          24,
          is_unlocked ? iconColor : mutedColor
        )}
        {is_unlocked && (
          <XStack
            position="absolute"
            bottom={-2}
            right={-2}
            width={18}
            height={18}
            borderRadius={9}
            backgroundColor="$success"
            justifyContent="center"
            alignItems="center"
          >
            <Check size={10} color="white" weight="bold" />
          </XStack>
        )}
      </XStack>

      {/* Content */}
      <YStack flex={1} gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize="$4"
            fontWeight="600"
            color={is_unlocked ? '$color' : '$colorMuted'}
          >
            {achievement.name}
          </Text>
          <XStack
            backgroundColor="$backgroundHover"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text
              fontSize="$3"
              fontWeight="600"
              color="$colorMuted"
            >
              +{achievement.xp_reward} XP
            </Text>
          </XStack>
        </XStack>

        <Text fontSize="$3" color="$colorMuted" numberOfLines={2}>
          {achievement.description}
        </Text>

        {/* Progress bar for locked achievements */}
        {!is_unlocked && (
          <YStack gap="$1" marginTop="$1">
            <YStack height={4} backgroundColor="$backgroundHover" borderRadius="$1">
              <YStack
                height={4}
                backgroundColor="$primary"
                borderRadius="$1"
                width={`${progressPercent}%`}
              />
            </YStack>
            <Text fontSize="$3" color="$colorMuted">
              {progress} / {achievement.requirement_value}
            </Text>
          </YStack>
        )}

        {/* Unlocked date */}
        {is_unlocked && unlocked_at && (
          <Text fontSize="$3" color="$colorMuted">
            Unlocked {new Date(unlocked_at).toLocaleDateString()}
          </Text>
        )}
      </YStack>
    </XStack>
  );
}
