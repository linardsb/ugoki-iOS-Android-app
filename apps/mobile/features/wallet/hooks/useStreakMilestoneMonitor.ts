/**
 * Streak Milestone Monitor Hook
 *
 * Monitors streak data and grants $UGOKI rewards when milestones are crossed.
 * Milestones: 7-day (50 $UGOKI), 30-day (200 $UGOKI)
 *
 * Usage:
 *   const { data: streaks } = useStreaks();
 *   useStreakMilestoneMonitor(streaks);
 */

import { useEffect, useRef } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { useRewards } from './useRewards';

// Streak milestones that grant rewards
const MILESTONES = [7, 30] as const;

interface Streak {
  streak_type: string;
  current_count: number;
}

/**
 * Hook to monitor streaks and grant rewards when milestones are crossed.
 * Should be called with current streak data whenever it updates.
 *
 * @param streaks - Array of streak objects from useStreaks() or useProgression()
 */
export function useStreakMilestoneMonitor(streaks: Streak[] | undefined) {
  const { grantStreakReward, isWalletConnected } = useRewards();
  const updateStreakCount = useWalletStore((s) => s.updateStreakCount);
  const markMilestoneRewarded = useWalletStore((s) => s.markMilestoneRewarded);
  const isMilestoneRewarded = useWalletStore((s) => s.isMilestoneRewarded);
  const streakTracker = useWalletStore((s) => s.streakTracker);

  // Track if we've processed this data to avoid duplicate processing
  const processedRef = useRef<string>('');

  useEffect(() => {
    // Skip if no streaks or wallet not connected
    if (!streaks || streaks.length === 0 || !isWalletConnected) {
      return;
    }

    // Create a key to check if we've already processed this exact data
    const dataKey = streaks.map((s) => `${s.streak_type}:${s.current_count}`).join('|');
    if (processedRef.current === dataKey) {
      return; // Already processed this exact data
    }
    processedRef.current = dataKey;

    // Process each streak
    for (const streak of streaks) {
      const { streak_type, current_count } = streak;
      const lastKnown = streakTracker.lastKnownCounts[streak_type] ?? 0;

      // Check each milestone
      for (const milestone of MILESTONES) {
        // Check if this milestone was just crossed
        // (current >= milestone AND last < milestone AND not already rewarded)
        const justCrossed = current_count >= milestone && lastKnown < milestone;
        const alreadyRewarded = isMilestoneRewarded(streak_type, milestone);

        if (justCrossed && !alreadyRewarded) {
          console.log(
            `[StreakMonitor] Milestone crossed: ${streak_type} reached ${milestone} days (was ${lastKnown})`
          );

          // Grant the reward
          const reward = grantStreakReward(milestone, streak_type);

          if (reward > 0) {
            // Mark this milestone as rewarded to prevent duplicates
            markMilestoneRewarded(streak_type, milestone);
            console.log(
              `[StreakMonitor] Granted ${reward} $UGOKI for ${milestone}-day ${streak_type} streak`
            );
          }
        }
      }

      // Update the last known count for this streak type
      if (current_count !== lastKnown) {
        updateStreakCount(streak_type, current_count);
      }
    }
  }, [
    streaks,
    isWalletConnected,
    streakTracker.lastKnownCounts,
    grantStreakReward,
    updateStreakCount,
    markMilestoneRewarded,
    isMilestoneRewarded,
  ]);
}
