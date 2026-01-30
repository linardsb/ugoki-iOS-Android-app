/**
 * Rewards Hook - Grants $UGOKI token rewards for activities
 *
 * Reward Structure (from CARDANO_FIT.md):
 * - 16:8 fast (16h) → 10 $UGOKI
 * - 18:6 fast (18h) → 20 $UGOKI
 * - 20:4+ fast (20h+) → 40 $UGOKI
 * - Workout completion → 5-15 $UGOKI (based on duration)
 * - 7-day streak bonus → 50 $UGOKI
 */

import { useCallback } from 'react';
import { useWalletStore, useIsWalletConnected } from '../stores/walletStore';
import type { PendingReward } from '../types';

// Reward amounts in $UGOKI tokens
const FASTING_REWARDS = {
  short: { minHours: 12, maxHours: 16, amount: 10 }, // 12-16h = 10 tokens
  medium: { minHours: 16, maxHours: 20, amount: 20 }, // 16-20h = 20 tokens
  long: { minHours: 20, maxHours: Infinity, amount: 40 }, // 20h+ = 40 tokens
} as const;

const WORKOUT_REWARDS = {
  short: { minMinutes: 0, maxMinutes: 15, amount: 5 }, // <15 min = 5 tokens
  medium: { minMinutes: 15, maxMinutes: 30, amount: 10 }, // 15-30 min = 10 tokens
  long: { minMinutes: 30, maxMinutes: Infinity, amount: 15 }, // 30+ min = 15 tokens
} as const;

const STREAK_REWARDS = {
  weekly: 50, // 7-day streak bonus
  monthly: 200, // 30-day streak bonus (future)
} as const;

const ACHIEVEMENT_BASE_REWARD = 25; // Base reward for achievements

/**
 * Calculate fasting reward based on duration
 */
function calculateFastingReward(durationHours: number): number {
  if (durationHours >= FASTING_REWARDS.long.minHours) {
    return FASTING_REWARDS.long.amount;
  }
  if (durationHours >= FASTING_REWARDS.medium.minHours) {
    return FASTING_REWARDS.medium.amount;
  }
  if (durationHours >= FASTING_REWARDS.short.minHours) {
    return FASTING_REWARDS.short.amount;
  }
  // Less than 12 hours - no reward
  return 0;
}

/**
 * Calculate workout reward based on duration
 */
function calculateWorkoutReward(durationMinutes: number): number {
  if (durationMinutes >= WORKOUT_REWARDS.long.minMinutes) {
    return WORKOUT_REWARDS.long.amount;
  }
  if (durationMinutes >= WORKOUT_REWARDS.medium.minMinutes) {
    return WORKOUT_REWARDS.medium.amount;
  }
  return WORKOUT_REWARDS.short.amount;
}

/**
 * Format duration for display
 */
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Hook to grant rewards for completed activities
 */
export function useRewards() {
  const isWalletConnected = useIsWalletConnected();
  const addPendingReward = useWalletStore((s) => s.addPendingReward);

  /**
   * Grant reward for completing a fast
   * @param startTime - ISO string of when fast started
   * @param endTime - ISO string of when fast ended
   * @returns The reward amount granted (0 if wallet not connected or duration too short)
   */
  const grantFastingReward = useCallback(
    (startTime: string, endTime: string): number => {
      if (!isWalletConnected) {
        console.log('[Rewards] Wallet not connected, skipping reward');
        return 0;
      }

      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const durationMs = end - start;
      const durationHours = durationMs / (1000 * 60 * 60);

      const amount = calculateFastingReward(durationHours);

      if (amount === 0) {
        console.log(`[Rewards] Fast too short (${formatDuration(durationHours)}), no reward`);
        return 0;
      }

      const reward: Omit<PendingReward, 'id' | 'claimed'> = {
        type: 'fasting',
        amount: amount.toString(),
        description: `Completed ${formatDuration(durationHours)} fast`,
        earnedAt: new Date().toISOString(),
      };

      addPendingReward(reward);
      console.log(`[Rewards] Granted ${amount} $UGOKI for ${formatDuration(durationHours)} fast`);

      return amount;
    },
    [isWalletConnected, addPendingReward]
  );

  /**
   * Grant reward for completing a workout
   * @param durationMinutes - Workout duration in minutes
   * @param workoutName - Name of the workout for description
   * @returns The reward amount granted
   */
  const grantWorkoutReward = useCallback(
    (durationMinutes: number, workoutName?: string): number => {
      if (!isWalletConnected) {
        console.log('[Rewards] Wallet not connected, skipping reward');
        return 0;
      }

      const amount = calculateWorkoutReward(durationMinutes);

      const reward: Omit<PendingReward, 'id' | 'claimed'> = {
        type: 'workout',
        amount: amount.toString(),
        description: workoutName
          ? `Completed "${workoutName}" (${durationMinutes}min)`
          : `Completed ${durationMinutes}min workout`,
        earnedAt: new Date().toISOString(),
      };

      addPendingReward(reward);
      console.log(`[Rewards] Granted ${amount} $UGOKI for workout`);

      return amount;
    },
    [isWalletConnected, addPendingReward]
  );

  /**
   * Grant reward for maintaining a streak
   * @param streakDays - Number of consecutive days
   * @param streakType - Type of streak (fasting, workout, etc.)
   * @returns The reward amount granted
   */
  const grantStreakReward = useCallback(
    (streakDays: number, streakType: string): number => {
      if (!isWalletConnected) {
        return 0;
      }

      // Only grant at milestones
      if (streakDays !== 7 && streakDays !== 30) {
        return 0;
      }

      const amount = streakDays === 7 ? STREAK_REWARDS.weekly : STREAK_REWARDS.monthly;

      const reward: Omit<PendingReward, 'id' | 'claimed'> = {
        type: 'streak',
        amount: amount.toString(),
        description: `${streakDays}-day ${streakType} streak`,
        earnedAt: new Date().toISOString(),
      };

      addPendingReward(reward);
      console.log(`[Rewards] Granted ${amount} $UGOKI for ${streakDays}-day streak`);

      return amount;
    },
    [isWalletConnected, addPendingReward]
  );

  /**
   * Grant reward for unlocking an achievement
   * @param achievementName - Name of the achievement
   * @param bonusMultiplier - Optional multiplier for rare achievements (default 1)
   * @returns The reward amount granted
   */
  const grantAchievementReward = useCallback(
    (achievementName: string, bonusMultiplier: number = 1): number => {
      if (!isWalletConnected) {
        return 0;
      }

      const amount = Math.floor(ACHIEVEMENT_BASE_REWARD * bonusMultiplier);

      const reward: Omit<PendingReward, 'id' | 'claimed'> = {
        type: 'achievement',
        amount: amount.toString(),
        description: `Unlocked "${achievementName}"`,
        earnedAt: new Date().toISOString(),
      };

      addPendingReward(reward);
      console.log(`[Rewards] Granted ${amount} $UGOKI for achievement`);

      return amount;
    },
    [isWalletConnected, addPendingReward]
  );

  return {
    grantFastingReward,
    grantWorkoutReward,
    grantStreakReward,
    grantAchievementReward,
    isWalletConnected,
  };
}

// Export reward constants for reference
export const REWARD_AMOUNTS = {
  FASTING_REWARDS,
  WORKOUT_REWARDS,
  STREAK_REWARDS,
  ACHIEVEMENT_BASE_REWARD,
};
