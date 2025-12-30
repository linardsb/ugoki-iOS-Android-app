// Fasting module types - matches backend time_keeper module schemas

export type WindowType = 'fast' | 'eating' | 'workout' | 'recovery';

export type WindowState = 'scheduled' | 'active' | 'completed' | 'abandoned';

export interface TimeWindow {
  id: string;
  identity_id: string;
  start_time: string; // ISO datetime
  end_time: string | null;
  scheduled_end: string | null;
  window_type: WindowType;
  state: WindowState;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Request types
export interface OpenWindowRequest {
  window_type: WindowType;
  scheduled_end?: string;
  metadata?: Record<string, unknown>;
}

export interface CloseWindowRequest {
  end_state: 'completed' | 'abandoned';
  metadata?: Record<string, unknown>;
}

export interface ExtendWindowRequest {
  new_end: string;
}

// Response types
export interface ElapsedResponse {
  elapsed_seconds: number;
}

export interface RemainingResponse {
  remaining_seconds: number | null;
}

// Fasting protocols with durations
export type FastingProtocol = '16:8' | '18:6' | '20:4' | 'custom';

export interface FastingProtocolConfig {
  id: FastingProtocol;
  label: string;
  fastHours: number;
  eatHours: number;
  description: string;
}

export const FASTING_PROTOCOLS: FastingProtocolConfig[] = [
  { id: '16:8', label: '16:8', fastHours: 16, eatHours: 8, description: 'Most popular - 16h fast, 8h eating' },
  { id: '18:6', label: '18:6', fastHours: 18, eatHours: 6, description: 'Intermediate - 18h fast, 6h eating' },
  { id: '20:4', label: '20:4', fastHours: 20, eatHours: 4, description: 'Advanced - 20h fast, 4h eating' },
];

// Local timer state (for UI updates)
export interface FastingTimerState {
  isActive: boolean;
  isPaused: boolean;
  startTime: string | null;
  scheduledEnd: string | null;
  pausedAt: string | null;
  totalPausedMs: number;
  windowId: string | null;
}

// Computed values for UI
export interface FastingProgress {
  elapsedMs: number;
  remainingMs: number | null;
  progressPercent: number;
  isComplete: boolean;
}
