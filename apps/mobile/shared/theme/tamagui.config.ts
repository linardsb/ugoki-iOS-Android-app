import { createTamagui, createTokens } from '@tamagui/core';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { themes as defaultThemes, tokens as defaultTokens } from '@tamagui/config/v3';
import { createMedia } from '@tamagui/react-native-media-driver';

// Custom color palette for UGOKI
const ugokiColors = {
  // Primary - Calm teal
  primary50: '#f0fdfa',
  primary100: '#ccfbf1',
  primary200: '#99f6e4',
  primary300: '#5eead4',
  primary400: '#2dd4bf',
  primary500: '#14b8a6', // Main primary
  primary600: '#0d9488',
  primary700: '#0f766e',
  primary800: '#115e59',
  primary900: '#134e4a',

  // Secondary - Energetic orange/coral
  secondary50: '#fff7ed',
  secondary100: '#ffedd5',
  secondary200: '#fed7aa',
  secondary300: '#fdba74',
  secondary400: '#fb923c',
  secondary500: '#f97316', // Main secondary
  secondary600: '#ea580c',
  secondary700: '#c2410c',
  secondary800: '#9a3412',
  secondary900: '#7c2d12',

  // Success - Green
  success50: '#f0fdf4',
  success500: '#22c55e',
  success600: '#16a34a',

  // Warning - Yellow
  warning50: '#fefce8',
  warning500: '#eab308',
  warning600: '#ca8a04',

  // Error - Red
  error50: '#fef2f2',
  error500: '#ef4444',
  error600: '#dc2626',

  // Neutral grays
  gray50: '#fafafa',
  gray100: '#f4f4f5',
  gray200: '#e4e4e7',
  gray300: '#d4d4d8',
  gray400: '#a1a1aa',
  gray500: '#71717a',
  gray600: '#52525b',
  gray700: '#3f3f46',
  gray800: '#27272a',
  gray900: '#18181b',
  gray950: '#121216',
};

// Create tokens
const tokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    ...ugokiColors,
  },
  size: {
    ...defaultTokens.size,
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
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
    24: 96,
    28: 112,
    32: 128,
    36: 144,
    40: 160,
    44: 176,
    48: 192,
    52: 208,
    56: 224,
    60: 240,
    64: 256,
    72: 288,
    80: 320,
    96: 384,
  },
  space: {
    ...defaultTokens.space,
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
  },
  radius: {
    ...defaultTokens.radius,
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    full: 9999,
  },
  zIndex: {
    ...defaultTokens.zIndex,
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

// Fonts
const interFont = createInterFont();

const fonts = {
  heading: interFont,
  body: interFont,
  mono: interFont,
};

// Media queries
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

// Custom themes
const lightTheme = {
  background: ugokiColors.gray50,
  backgroundHover: ugokiColors.gray100,
  backgroundPress: ugokiColors.gray200,
  backgroundFocus: ugokiColors.gray100,
  backgroundStrong: '#ffffff',
  backgroundTransparent: 'rgba(255, 255, 255, 0)',

  color: '#2B2B32',
  colorHover: '#3a3a42',
  colorPress: '#4a4a52',
  colorFocus: '#3a3a42',
  colorMuted: ugokiColors.gray500,
  colorSubtle: ugokiColors.gray400,

  borderColor: ugokiColors.gray200,
  borderColorHover: ugokiColors.gray300,
  borderColorPress: ugokiColors.gray400,
  borderColorFocus: ugokiColors.primary500,

  // Primary
  primary: ugokiColors.primary500,
  primaryHover: ugokiColors.primary600,
  primaryPress: ugokiColors.primary700,
  primaryFocus: ugokiColors.primary500,

  // Secondary
  secondary: ugokiColors.secondary500,
  secondaryHover: ugokiColors.secondary600,
  secondaryPress: ugokiColors.secondary700,

  // Status colors
  success: ugokiColors.success500,
  warning: ugokiColors.warning500,
  error: ugokiColors.error500,

  // Card
  cardBackground: '#ffffff',
  cardBorder: ugokiColors.gray200,

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  shadowColorStrong: 'rgba(0, 0, 0, 0.2)',
};

const darkTheme = {
  background: ugokiColors.gray950,
  backgroundHover: ugokiColors.gray900,
  backgroundPress: ugokiColors.gray800,
  backgroundFocus: ugokiColors.gray900,
  backgroundStrong: ugokiColors.gray900,
  backgroundTransparent: 'rgba(0, 0, 0, 0)',

  color: ugokiColors.gray50,
  colorHover: ugokiColors.gray100,
  colorPress: ugokiColors.gray200,
  colorFocus: ugokiColors.gray100,
  colorMuted: ugokiColors.gray400,
  colorSubtle: ugokiColors.gray500,

  borderColor: ugokiColors.gray800,
  borderColorHover: ugokiColors.gray700,
  borderColorPress: ugokiColors.gray600,
  borderColorFocus: ugokiColors.primary500,

  // Primary
  primary: ugokiColors.primary500,
  primaryHover: ugokiColors.primary400,
  primaryPress: ugokiColors.primary300,
  primaryFocus: ugokiColors.primary500,

  // Secondary
  secondary: ugokiColors.secondary500,
  secondaryHover: ugokiColors.secondary400,
  secondaryPress: ugokiColors.secondary300,

  // Status colors
  success: ugokiColors.success500,
  warning: ugokiColors.warning500,
  error: ugokiColors.error500,

  // Card
  cardBackground: ugokiColors.gray900,
  cardBorder: ugokiColors.gray800,

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowColorStrong: 'rgba(0, 0, 0, 0.5)',
};

// Create Tamagui config
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
