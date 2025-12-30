import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/shared/stores/storage';
import type { TimeWindow, FastingTimerState, FastingProgress } from '../types';

interface FastingStore {
  // Server-synced state
  activeWindow: TimeWindow | null;

  // Local UI state
  isPaused: boolean;
  pausedAt: number | null; // timestamp when paused
  totalPausedMs: number; // accumulated pause time

  // Actions
  setActiveWindow: (window: TimeWindow | null) => void;
  syncFromServer: (window: TimeWindow | null) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;

  // Computed
  getProgress: () => FastingProgress;
  getElapsedMs: () => number;
  getRemainingMs: () => number | null;
}

export const useFastingStore = create<FastingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      activeWindow: null,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,

      // Set active window (from server or local)
      setActiveWindow: (window) => {
        set({ activeWindow: window });
      },

      // Sync state from server response
      syncFromServer: (window) => {
        const state = get();

        if (!window) {
          // Fast ended - reset local state
          set({
            activeWindow: null,
            isPaused: false,
            pausedAt: null,
            totalPausedMs: 0,
          });
          return;
        }

        // If this is a new window, reset pause state
        if (state.activeWindow?.id !== window.id) {
          set({
            activeWindow: window,
            isPaused: false,
            pausedAt: null,
            totalPausedMs: 0,
          });
        } else {
          // Same window - just update the window data
          set({ activeWindow: window });
        }
      },

      // Pause the timer locally
      pause: () => {
        const { isPaused } = get();
        if (isPaused) return;

        set({
          isPaused: true,
          pausedAt: Date.now(),
        });
      },

      // Resume the timer
      resume: () => {
        const { isPaused, pausedAt, totalPausedMs } = get();
        if (!isPaused || !pausedAt) return;

        const pauseDuration = Date.now() - pausedAt;
        set({
          isPaused: false,
          pausedAt: null,
          totalPausedMs: totalPausedMs + pauseDuration,
        });
      },

      // Reset all state
      reset: () => {
        set({
          activeWindow: null,
          isPaused: false,
          pausedAt: null,
          totalPausedMs: 0,
        });
      },

      // Get elapsed time in milliseconds (accounting for pauses)
      getElapsedMs: () => {
        const { activeWindow, isPaused, pausedAt, totalPausedMs } = get();

        if (!activeWindow) return 0;

        const startTime = new Date(activeWindow.start_time).getTime();
        const now = Date.now();

        // Calculate total elapsed
        let elapsed = now - startTime;

        // Subtract total paused time
        elapsed -= totalPausedMs;

        // If currently paused, subtract current pause duration
        if (isPaused && pausedAt) {
          elapsed -= now - pausedAt;
        }

        return Math.max(0, elapsed);
      },

      // Get remaining time in milliseconds
      getRemainingMs: () => {
        const { activeWindow } = get();

        if (!activeWindow?.scheduled_end) return null;

        const scheduledEnd = new Date(activeWindow.scheduled_end).getTime();
        const elapsed = get().getElapsedMs();
        const startTime = new Date(activeWindow.start_time).getTime();
        const totalDuration = scheduledEnd - startTime;

        return Math.max(0, totalDuration - elapsed);
      },

      // Get progress info for UI
      getProgress: () => {
        const { activeWindow } = get();
        const elapsedMs = get().getElapsedMs();
        const remainingMs = get().getRemainingMs();

        if (!activeWindow) {
          return {
            elapsedMs: 0,
            remainingMs: null,
            progressPercent: 0,
            isComplete: false,
          };
        }

        // Calculate progress percentage
        let progressPercent = 0;
        let isComplete = false;

        if (activeWindow.scheduled_end) {
          const startTime = new Date(activeWindow.start_time).getTime();
          const endTime = new Date(activeWindow.scheduled_end).getTime();
          const totalDuration = endTime - startTime;

          if (totalDuration > 0) {
            progressPercent = Math.min(100, (elapsedMs / totalDuration) * 100);
            isComplete = progressPercent >= 100;
          }
        }

        return {
          elapsedMs,
          remainingMs,
          progressPercent,
          isComplete,
        };
      },
    }),
    {
      name: 'fasting-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        activeWindow: state.activeWindow,
        isPaused: state.isPaused,
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
      }),
    }
  )
);

// Selectors
export const useActiveFastWindow = () => useFastingStore((state) => state.activeWindow);
export const useIsFastPaused = () => useFastingStore((state) => state.isPaused);
export const useHasActiveFast = () => useFastingStore((state) => !!state.activeWindow);
