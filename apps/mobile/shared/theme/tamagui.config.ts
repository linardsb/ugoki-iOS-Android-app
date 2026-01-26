import { createTamagui, createTokens } from '@tamagui/core';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { tokens as defaultTokens } from '@tamagui/config/v3';
import { createMedia } from '@tamagui/react-native-media-driver';

import {
  flatColors,
  spacing,
  radius,
  shadows,
  shadowsDark,
  typography,
} from './tokens';

// =============================================================================
// TOKENS
// =============================================================================

const tokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    ...flatColors,
  },
  size: {
    ...defaultTokens.size,
    ...spacing,
    // Additional named sizes for components
    icon: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,
    },
    button: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56,
    },
    avatar: {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 56,
      xl: 80,
    },
  },
  space: {
    ...defaultTokens.space,
    ...spacing,
  },
  radius: {
    ...defaultTokens.radius,
    0: radius.none,
    1: radius.sm,
    2: radius.md,
    3: radius.lg,
    4: radius.xl,
    5: radius['2xl'],
    6: radius['3xl'],
    full: radius.full,
    // Named radius tokens
    xs: radius.xs,
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
    '2xl': radius['2xl'],
    '3xl': radius['3xl'],
  },
  zIndex: {
    ...defaultTokens.zIndex,
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    overlay: 500,
    toast: 600,
    tooltip: 700,
  },
});

// =============================================================================
// FONTS WITH TYPOGRAPHY SCALE
// =============================================================================

const interFont = createInterFont({
  size: {
    1: typography.fontSize.xs,    // 12
    2: typography.fontSize.sm,    // 14
    3: typography.fontSize.base,  // 16
    4: typography.fontSize.lg,    // 18
    5: typography.fontSize.xl,    // 20
    6: typography.fontSize['2xl'], // 24
    7: typography.fontSize['3xl'], // 30
    8: typography.fontSize['4xl'], // 36
    9: typography.fontSize['5xl'], // 48
    // Semantic aliases
    xs: typography.fontSize.xs,
    sm: typography.fontSize.sm,
    base: typography.fontSize.base,
    lg: typography.fontSize.lg,
    xl: typography.fontSize.xl,
    '2xl': typography.fontSize['2xl'],
    '3xl': typography.fontSize['3xl'],
    '4xl': typography.fontSize['4xl'],
    '5xl': typography.fontSize['5xl'],
  },
  weight: {
    1: typography.fontWeight.normal,
    3: typography.fontWeight.medium,
    5: typography.fontWeight.semibold,
    7: typography.fontWeight.bold,
    9: typography.fontWeight.extrabold,
    // Named weights
    normal: typography.fontWeight.normal,
    medium: typography.fontWeight.medium,
    semibold: typography.fontWeight.semibold,
    bold: typography.fontWeight.bold,
    extrabold: typography.fontWeight.extrabold,
  },
  letterSpacing: {
    1: typography.letterSpacing.tighter,
    2: typography.letterSpacing.tight,
    3: typography.letterSpacing.normal,
    4: typography.letterSpacing.wide,
    5: typography.letterSpacing.wider,
    // Named
    tighter: typography.letterSpacing.tighter,
    tight: typography.letterSpacing.tight,
    normal: typography.letterSpacing.normal,
    wide: typography.letterSpacing.wide,
    wider: typography.letterSpacing.wider,
  },
});

const fonts = {
  heading: interFont,
  body: interFont,
  mono: interFont,
};

// =============================================================================
// MEDIA QUERIES
// =============================================================================

const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' },
  pointerCoarse: { pointer: 'coarse' },
});

// =============================================================================
// LIGHT THEME
// =============================================================================

const lightTheme = {
  // Background
  background: flatColors.gray50,           // Near White (#FAFAF8)
  backgroundHover: flatColors.gray100,     // Pearl Mist
  backgroundPress: flatColors.gray200,
  backgroundFocus: flatColors.gray100,
  backgroundStrong: flatColors.gray0,      // Pure white
  backgroundTransparent: 'rgba(255, 255, 255, 0)',
  backgroundSoft: flatColors.gray100,

  // Text colors
  color: flatColors.gray900,               // Midnight Indigo
  colorHover: flatColors.gray800,
  colorPress: flatColors.gray700,
  colorFocus: flatColors.gray800,
  colorMuted: flatColors.gray500,
  colorSubtle: flatColors.gray400,

  // Border
  borderColor: flatColors.gray200,
  borderColorHover: flatColors.gray300,
  borderColorPress: flatColors.gray400,
  borderColorFocus: flatColors.primary500,

  // Primary - Slate Blue
  primary: flatColors.primary500,
  primaryHover: flatColors.primary600,
  primaryPress: flatColors.primary700,
  primaryFocus: flatColors.primary500,
  primaryMuted: flatColors.primary100,
  primarySubtle: flatColors.primary50,

  // Secondary - Peach Coral
  secondary: flatColors.secondary500,
  secondaryHover: flatColors.secondary600,
  secondaryPress: flatColors.secondary700,
  secondaryMuted: flatColors.secondary100,
  secondarySubtle: flatColors.secondary50,

  // Semantic colors
  success: flatColors.success500,          // Sage Green
  successMuted: flatColors.success100,
  successSubtle: flatColors.success50,

  warning: flatColors.warning500,
  warningMuted: flatColors.warning100,
  warningSubtle: flatColors.warning50,

  error: flatColors.error500,
  errorMuted: flatColors.error100,
  errorSubtle: flatColors.error50,

  info: flatColors.info500,
  infoMuted: flatColors.info100,
  infoSubtle: flatColors.info50,

  // Card
  cardBackground: flatColors.gray100,      // Pearl Mist for cards
  cardBorder: flatColors.gray300,          // Visible grey border on light theme

  // Shadows (light theme uses standard shadows)
  shadowColor: shadows.md.shadowColor,
  shadowColorStrong: shadows.lg.shadowColor,

  // Component-specific tokens
  switchTrackOn: flatColors.success500,
  switchTrackOff: flatColors.gray200,
  switchThumb: flatColors.gray0,

  // Progress/metrics
  progressBackground: flatColors.gray200,
  progressFill: flatColors.primary500,

  // Trend colors
  trendUp: flatColors.success500,
  trendDown: flatColors.error500,
  trendNeutral: flatColors.gray400,
};

// =============================================================================
// DARK THEME
// =============================================================================

const darkTheme = {
  // Background
  background: flatColors.gray900,          // Dark background (#212020)
  backgroundHover: flatColors.gray800,
  backgroundPress: flatColors.gray700,
  backgroundFocus: flatColors.gray800,
  backgroundStrong: flatColors.gray800,
  backgroundTransparent: 'rgba(0, 0, 0, 0)',
  backgroundSoft: flatColors.gray800,

  // Text colors
  color: flatColors.gray100,               // Pearl Mist for text
  colorHover: flatColors.gray50,
  colorPress: flatColors.gray200,
  colorFocus: flatColors.gray50,
  colorMuted: flatColors.gray300,          // Brighter muted text for dark theme
  colorSubtle: flatColors.gray400,         // Brighter subtle text for dark theme

  // Border
  borderColor: flatColors.gray700,
  borderColorHover: flatColors.gray600,
  borderColorPress: flatColors.gray500,
  borderColorFocus: flatColors.primary400,

  // Primary - Slate Blue (lighter for dark theme)
  primary: flatColors.primary400,
  primaryHover: flatColors.primary300,
  primaryPress: flatColors.primary200,
  primaryFocus: flatColors.primary400,
  primaryMuted: flatColors.primary800,
  primarySubtle: flatColors.primary900,

  // Secondary - Peach Coral (lighter for dark theme)
  secondary: flatColors.secondary400,
  secondaryHover: flatColors.secondary300,
  secondaryPress: flatColors.secondary200,
  secondaryMuted: flatColors.secondary800,
  secondarySubtle: flatColors.secondary900,

  // Semantic colors
  success: flatColors.success400,
  successMuted: flatColors.success800,
  successSubtle: flatColors.success900,

  warning: flatColors.warning400,
  warningMuted: flatColors.warning800,
  warningSubtle: flatColors.warning900,

  error: flatColors.error400,
  errorMuted: flatColors.error800,
  errorSubtle: flatColors.error900,

  info: flatColors.info400,
  infoMuted: flatColors.info800,
  infoSubtle: flatColors.info900,

  // Card
  cardBackground: flatColors.gray800,      // Slightly lighter than Midnight Indigo
  cardBorder: 'transparent',               // No visible border on dark theme

  // Shadows (dark theme uses darker shadows)
  shadowColor: shadowsDark.md.shadowColor,
  shadowColorStrong: shadowsDark.lg.shadowColor,

  // Component-specific tokens
  switchTrackOn: flatColors.success400,
  switchTrackOff: flatColors.gray700,
  switchThumb: flatColors.gray100,

  // Progress/metrics
  progressBackground: flatColors.gray700,
  progressFill: flatColors.primary400,

  // Trend colors
  trendUp: flatColors.success400,
  trendDown: flatColors.error400,
  trendNeutral: flatColors.gray500,
};

// =============================================================================
// CREATE TAMAGUI CONFIG
// =============================================================================

const config = createTamagui({
  tokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  fonts,
  media,
  shorthands,
  defaultTheme: 'light',
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
});

export type AppConfig = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;

// =============================================================================
// RE-EXPORT TOKENS FOR DIRECT USE
// =============================================================================

export { shadows, shadowsDark, typography, radius, spacing } from './tokens';
