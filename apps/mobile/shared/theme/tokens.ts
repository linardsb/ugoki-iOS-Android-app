/**
 * UGOKI Design System Tokens
 *
 * Centralized token definitions for the UGOKI mobile app.
 * All design values should be defined here and consumed via tamagui.config.ts
 *
 * Changing values here will update the entire application.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Primary - Slate Blue
  primary: {
    50: '#EFF3F9',
    100: '#D9E2F1',
    200: '#B3C5E3',
    300: '#8DA8D5',
    400: '#678BC7',
    500: '#3A5BA0', // Main primary
    600: '#2E4980',
    700: '#233760',
    800: '#172540',
    900: '#0C1220',
  },

  // Secondary - Peach Coral (CTAs, highlights, achievements)
  secondary: {
    50: '#FFF8F5',
    100: '#FFEEE7',
    200: '#FFDCD0',
    300: '#FFCAB8',
    400: '#FFB79F',
    500: '#FFA387', // Main secondary
    600: '#E88A6E',
    700: '#D07156',
    800: '#B8583E',
    900: '#A04026',
  },

  // Accent - Sage Green (Success, health metrics)
  success: {
    50: '#EFF8F5',
    100: '#D8EFE6',
    200: '#B1DFCD',
    300: '#8ACFB4',
    400: '#6ABF9B',
    500: '#4A9B7F', // Main success/sage green
    600: '#3B7C66',
    700: '#2C5D4C',
    800: '#1E3E33',
    900: '#0F1F19',
  },

  // Warning - Amber
  warning: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308', // Main warning
    600: '#CA8A04',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
  },

  // Error - Red
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main error
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Info - Blue
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main info
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral - Based on Midnight Indigo and Pearl Mist
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF8',   // Near White - light theme background
    100: '#F5F3EF',  // Pearl Mist - light accents, cards
    200: '#E8E6E2',
    300: '#D4D2CE',
    400: '#9A98A0',
    500: '#6B697A',
    600: '#4A4860',
    700: '#353350',
    800: '#2A2B4A',  // Dark card background
    900: '#212020',  // Dark theme background
    950: '#161530',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  fontFamily: {
    heading: 'Homizio',
    body: 'Homizio',
    mono: 'Homizio',
  },

  // Font sizes (in pixels, converted to rem-equivalent for mobile)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights (multipliers)
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Dark theme shadows (more subtle)
export const shadowsDark = {
  none: shadows.none,
  sm: {
    ...shadows.sm,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
  },
  md: {
    ...shadows.md,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  lg: {
    ...shadows.lg,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
  },
  xl: {
    ...shadows.xl,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  overlay: 500,
  toast: 600,
  tooltip: 700,
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

export const animation = {
  duration: {
    fastest: 50,
    faster: 100,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 400,
    slowest: 500,
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// =============================================================================
// EXPORTS - Flat color tokens for Tamagui
// =============================================================================

export const flatColors = {
  // Primary palette
  primary50: colors.primary[50],
  primary100: colors.primary[100],
  primary200: colors.primary[200],
  primary300: colors.primary[300],
  primary400: colors.primary[400],
  primary500: colors.primary[500],
  primary600: colors.primary[600],
  primary700: colors.primary[700],
  primary800: colors.primary[800],
  primary900: colors.primary[900],

  // Secondary palette
  secondary50: colors.secondary[50],
  secondary100: colors.secondary[100],
  secondary200: colors.secondary[200],
  secondary300: colors.secondary[300],
  secondary400: colors.secondary[400],
  secondary500: colors.secondary[500],
  secondary600: colors.secondary[600],
  secondary700: colors.secondary[700],
  secondary800: colors.secondary[800],
  secondary900: colors.secondary[900],

  // Success palette
  success50: colors.success[50],
  success100: colors.success[100],
  success200: colors.success[200],
  success300: colors.success[300],
  success400: colors.success[400],
  success500: colors.success[500],
  success600: colors.success[600],
  success700: colors.success[700],
  success800: colors.success[800],
  success900: colors.success[900],

  // Warning palette
  warning50: colors.warning[50],
  warning100: colors.warning[100],
  warning200: colors.warning[200],
  warning300: colors.warning[300],
  warning400: colors.warning[400],
  warning500: colors.warning[500],
  warning600: colors.warning[600],
  warning700: colors.warning[700],
  warning800: colors.warning[800],
  warning900: colors.warning[900],

  // Error palette
  error50: colors.error[50],
  error100: colors.error[100],
  error200: colors.error[200],
  error300: colors.error[300],
  error400: colors.error[400],
  error500: colors.error[500],
  error600: colors.error[600],
  error700: colors.error[700],
  error800: colors.error[800],
  error900: colors.error[900],

  // Info palette
  info50: colors.info[50],
  info100: colors.info[100],
  info200: colors.info[200],
  info300: colors.info[300],
  info400: colors.info[400],
  info500: colors.info[500],
  info600: colors.info[600],
  info700: colors.info[700],
  info800: colors.info[800],
  info900: colors.info[900],

  // Neutral palette
  gray0: colors.neutral[0],
  gray50: colors.neutral[50],
  gray100: colors.neutral[100],
  gray200: colors.neutral[200],
  gray300: colors.neutral[300],
  gray400: colors.neutral[400],
  gray500: colors.neutral[500],
  gray600: colors.neutral[600],
  gray700: colors.neutral[700],
  gray800: colors.neutral[800],
  gray900: colors.neutral[900],
  gray950: colors.neutral[950],
} as const;
