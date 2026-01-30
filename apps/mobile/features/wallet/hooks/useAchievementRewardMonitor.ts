/**
 * Achievement Reward Monitor Hook
 *
 * Monitors achievement data and grants $UGOKI rewards when new achievements are unlocked.
 * Base reward: 25 $UGOKI per achievement (multiplied by XP tier)
 *
 * Usage:
 *   const { data: achievements } = useAchievements();
 *   useAchievementRewardMonitor(achievements);
 */

import { useEffect, useRef } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { useRewards } from './useRewards';

interface Achievement {
  id: string;
  name: string;
  xp_reward: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  achievement: Achievement;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

/**
 * Hook to monitor achievements and grant rewards when new ones are unlocked.
 * Should be called with current achievements data whenever it updates.
 *
 * @param achievements - Array of user achievements from useAchievements()
 */
export function useAchievementRewardMonitor(achievements: UserAchievement[] | undefined) {
  const { grantAchievementReward, isWalletConnected } = useRewards();
  const rewardedAchievements = useWalletStore((s) => s.streakTracker.rewardedMilestones);
  const markMilestoneRewarded = useWalletStore((s) => s.markMilestoneRewarded);

  // Track if we've processed this data to avoid duplicate processing
  const processedRef = useRef<string>('');

  useEffect(() => {
    // Skip if no achievements or wallet not connected
    if (!achievements || achievements.length === 0 || !isWalletConnected) {
      return;
    }

    // Get only unlocked achievements
    const unlocked = achievements.filter((a) => a.is_unlocked);
    if (unlocked.length === 0) {
      return;
    }

    // Create a key to check if we've already processed this exact data
    const dataKey = unlocked.map((a) => a.achievement_id).sort().join('|');
    if (processedRef.current === dataKey) {
      return; // Already processed this exact data
    }
    processedRef.current = dataKey;

    // Process each unlocked achievement
    for (const userAchievement of unlocked) {
      const achievementKey = `achievement_${userAchievement.achievement_id}`;

      // Check if we've already rewarded this achievement
      if (rewardedAchievements[achievementKey]) {
        continue;
      }

      // Calculate bonus multiplier based on XP reward (higher XP = rarer achievement)
      // Base: 25 tokens, multiplied by tier
      // 100+ XP = 2x, 250+ XP = 3x, 500+ XP = 4x
      let multiplier = 1;
      const xpReward = userAchievement.achievement.xp_reward;
      if (xpReward >= 500) {
        multiplier = 4;
      } else if (xpReward >= 250) {
        multiplier = 3;
      } else if (xpReward >= 100) {
        multiplier = 2;
      }

      console.log(
        `[AchievementMonitor] New achievement unlocked: "${userAchievement.achievement.name}" (${xpReward} XP, ${multiplier}x multiplier)`
      );

      // Grant the reward
      const reward = grantAchievementReward(userAchievement.achievement.name, multiplier);

      if (reward > 0) {
        // Mark this achievement as rewarded to prevent duplicates
        // Using the milestone tracking system with 'achievement' prefix
        markMilestoneRewarded('achievement', parseInt(userAchievement.achievement_id.replace(/\D/g, '')) || Date.now());

        console.log(
          `[AchievementMonitor] Granted ${reward} $UGOKI for "${userAchievement.achievement.name}"`
        );
      }
    }
  }, [
    achievements,
    isWalletConnected,
    rewardedAchievements,
    grantAchievementReward,
    markMilestoneRewarded,
  ]);
}
