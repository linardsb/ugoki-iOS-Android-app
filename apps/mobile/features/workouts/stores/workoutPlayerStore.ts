import { create } from 'zustand';
import type { Exercise, Workout } from '../types';

type PlayerPhase = 'warmup' | 'exercise' | 'rest' | 'complete';

interface WorkoutPlayerState {
  // Session info
  sessionId: string | null;
  workout: Workout | null;

  // Current state
  currentExerciseIndex: number;
  phase: PlayerPhase;
  isPaused: boolean;

  // Timing
  phaseStartTime: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  exerciseTimeRemaining: number; // in seconds

  // Stats
  totalElapsedMs: number;
  caloriesBurned: number;

  // Actions
  initialize: (sessionId: string, workout: Workout) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  complete: () => void;
  reset: () => void;
  tick: () => void;

  // Getters
  getCurrentExercise: () => Exercise | null;
  getProgress: () => { current: number; total: number; percent: number };
  getPhaseTimeRemaining: () => number;
  getTotalElapsed: () => number;
}

const WARMUP_SECONDS = 5; // Countdown before first exercise

export const useWorkoutPlayerStore = create<WorkoutPlayerState>()((set, get) => ({
  // Initial state
  sessionId: null,
  workout: null,
  currentExerciseIndex: 0,
  phase: 'warmup',
  isPaused: true,
  phaseStartTime: null,
  pausedAt: null,
  totalPausedMs: 0,
  exerciseTimeRemaining: WARMUP_SECONDS,
  totalElapsedMs: 0,
  caloriesBurned: 0,

  initialize: (sessionId, workout) => {
    set({
      sessionId,
      workout,
      currentExerciseIndex: 0,
      phase: 'warmup',
      isPaused: true,
      phaseStartTime: null,
      pausedAt: null,
      totalPausedMs: 0,
      exerciseTimeRemaining: WARMUP_SECONDS,
      totalElapsedMs: 0,
      caloriesBurned: 0,
    });
  },

  start: () => {
    const now = Date.now();
    set({
      isPaused: false,
      phaseStartTime: now,
      pausedAt: null,
    });
  },

  pause: () => {
    const { isPaused } = get();
    if (isPaused) return;

    set({
      isPaused: true,
      pausedAt: Date.now(),
    });
  },

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

  skip: () => {
    const { workout, currentExerciseIndex, phase } = get();
    if (!workout) return;

    const exercises = workout.exercises;
    const currentExercise = exercises[currentExerciseIndex];

    if (phase === 'warmup') {
      // Skip to first exercise
      set({
        phase: 'exercise',
        exerciseTimeRemaining: exercises[0]?.duration_seconds || 0,
        phaseStartTime: Date.now(),
      });
    } else if (phase === 'exercise') {
      // Skip to rest or next exercise
      if (currentExercise?.rest_seconds > 0) {
        set({
          phase: 'rest',
          exerciseTimeRemaining: currentExercise.rest_seconds,
          phaseStartTime: Date.now(),
        });
      } else {
        // No rest, go to next exercise
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= exercises.length) {
          set({ phase: 'complete' });
        } else {
          set({
            currentExerciseIndex: nextIndex,
            phase: 'exercise',
            exerciseTimeRemaining: exercises[nextIndex].duration_seconds,
            phaseStartTime: Date.now(),
          });
        }
      }
    } else if (phase === 'rest') {
      // Skip to next exercise
      const nextIndex = currentExerciseIndex + 1;
      if (nextIndex >= exercises.length) {
        set({ phase: 'complete' });
      } else {
        set({
          currentExerciseIndex: nextIndex,
          phase: 'exercise',
          exerciseTimeRemaining: exercises[nextIndex].duration_seconds,
          phaseStartTime: Date.now(),
        });
      }
    }
  },

  complete: () => {
    set({ phase: 'complete', isPaused: true });
  },

  reset: () => {
    set({
      sessionId: null,
      workout: null,
      currentExerciseIndex: 0,
      phase: 'warmup',
      isPaused: true,
      phaseStartTime: null,
      pausedAt: null,
      totalPausedMs: 0,
      exerciseTimeRemaining: WARMUP_SECONDS,
      totalElapsedMs: 0,
      caloriesBurned: 0,
    });
  },

  tick: () => {
    const {
      workout,
      currentExerciseIndex,
      phase,
      isPaused,
      phaseStartTime,
      totalPausedMs,
      exerciseTimeRemaining,
      caloriesBurned,
    } = get();

    if (isPaused || phase === 'complete' || !workout || !phaseStartTime) return;

    const exercises = workout.exercises;
    const currentExercise = exercises[currentExerciseIndex];
    const now = Date.now();

    // Calculate time in current phase
    const phaseElapsed = Math.floor((now - phaseStartTime - totalPausedMs) / 1000);
    let phaseDuration = 0;

    if (phase === 'warmup') {
      phaseDuration = WARMUP_SECONDS;
    } else if (phase === 'exercise') {
      phaseDuration = currentExercise?.duration_seconds || 0;
    } else if (phase === 'rest') {
      phaseDuration = currentExercise?.rest_seconds || 0;
    }

    const remaining = Math.max(0, phaseDuration - phaseElapsed);

    // Update calories (rough estimate based on exercise)
    let newCalories = caloriesBurned;
    if (phase === 'exercise' && currentExercise) {
      newCalories = caloriesBurned + (currentExercise.calories_per_minute / 60);
    }

    // Check if phase is complete
    if (remaining <= 0) {
      if (phase === 'warmup') {
        // Start first exercise
        set({
          phase: 'exercise',
          exerciseTimeRemaining: exercises[0]?.duration_seconds || 0,
          phaseStartTime: Date.now(),
          totalPausedMs: 0,
        });
      } else if (phase === 'exercise') {
        // Move to rest or next exercise
        if (currentExercise?.rest_seconds > 0) {
          set({
            phase: 'rest',
            exerciseTimeRemaining: currentExercise.rest_seconds,
            phaseStartTime: Date.now(),
            totalPausedMs: 0,
            caloriesBurned: newCalories,
          });
        } else {
          const nextIndex = currentExerciseIndex + 1;
          if (nextIndex >= exercises.length) {
            set({ phase: 'complete', caloriesBurned: newCalories });
          } else {
            set({
              currentExerciseIndex: nextIndex,
              phase: 'exercise',
              exerciseTimeRemaining: exercises[nextIndex].duration_seconds,
              phaseStartTime: Date.now(),
              totalPausedMs: 0,
              caloriesBurned: newCalories,
            });
          }
        }
      } else if (phase === 'rest') {
        // Move to next exercise
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= exercises.length) {
          set({ phase: 'complete' });
        } else {
          set({
            currentExerciseIndex: nextIndex,
            phase: 'exercise',
            exerciseTimeRemaining: exercises[nextIndex].duration_seconds,
            phaseStartTime: Date.now(),
            totalPausedMs: 0,
          });
        }
      }
    } else {
      set({
        exerciseTimeRemaining: remaining,
        caloriesBurned: newCalories,
      });
    }
  },

  getCurrentExercise: () => {
    const { workout, currentExerciseIndex } = get();
    if (!workout) return null;
    return workout.exercises[currentExerciseIndex] || null;
  },

  getProgress: () => {
    const { workout, currentExerciseIndex, phase } = get();
    if (!workout) return { current: 0, total: 0, percent: 0 };

    const total = workout.exercises.length;
    let current = currentExerciseIndex;

    if (phase === 'complete') {
      current = total;
    } else if (phase === 'rest') {
      current = currentExerciseIndex + 0.5;
    }

    return {
      current: Math.ceil(current),
      total,
      percent: total > 0 ? (current / total) * 100 : 0,
    };
  },

  getPhaseTimeRemaining: () => {
    return get().exerciseTimeRemaining;
  },

  getTotalElapsed: () => {
    const { phaseStartTime, totalPausedMs, isPaused, pausedAt } = get();
    if (!phaseStartTime) return 0;

    let elapsed = Date.now() - phaseStartTime - totalPausedMs;
    if (isPaused && pausedAt) {
      elapsed -= Date.now() - pausedAt;
    }
    return Math.max(0, elapsed);
  },
}));
