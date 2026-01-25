/**
 * Global color constants for Research Hub feature.
 * Ensures consistent text and background colors across all components.
 *
 * Pattern:
 * - Light cards (BenefitBadge, WHO IS THIS FOR) → always use dark text
 * - Theme backgrounds → use theme-aware text colors
 */

// Text colors for content on LIGHT card backgrounds (always visible)
export const CARD_TEXT = {
  title: '#1F2041',       // Midnight Indigo for titles
  body: '#4A4860',        // Medium gray for body text
  muted: '#6B697A',       // Muted gray for secondary text
};

// Theme-aware colors (use with isDark check)
// IMPORTANT: Dark mode colors must be VERY BRIGHT for readability on dark backgrounds
export const THEME_TEXT = {
  light: {
    primary: '#1F2041',   // Midnight Indigo for light backgrounds
    secondary: '#4A4860',
    muted: '#6B697A',
    subtle: '#9A98A0',
  },
  dark: {
    primary: '#F5F3EF',   // Pearl Mist for dark backgrounds
    secondary: '#F5F3EF', // Pearl Mist - use for body text
    muted: '#E8E6E2',     // Slightly dimmed - must be readable
    subtle: '#D4D2CE',    // Subtle text
  },
};

// Background colors
export const BACKGROUNDS = {
  light: {
    card: '#F5F3EF',      // Pearl Mist
    cardAlt: '#E8E6E2',
    page: '#FAFAF8',      // Near White
  },
  dark: {
    card: '#2A2B4A',      // Slightly lighter than Midnight Indigo
    cardAlt: '#353350',
    page: '#1F2041',      // Midnight Indigo
  },
};

// Special card backgrounds (light in both themes for contrast)
export const LIGHT_CARD = {
  background: '#F5F3EF',  // Pearl Mist
  backgroundAlt: '#E8E6E2',
  iconBg: '#E8E6E2',
  iconBgAlt: '#D4D2CE',
};

// Status colors (semantic colors)
export const STATUS = {
  success: {
    light: { bg: '#EFF8F5', text: '#4A9B7F' },  // Sage Green
    dark: { bg: '#1f3f2f', text: '#8DCFB7' },
  },
  warning: {
    light: { bg: '#FFF8F5', text: '#D07156' },  // Peach Coral darker
    dark: { bg: '#3f2f1f', text: '#FFCAB8' },
  },
  error: {
    light: { bg: '#fef2f2', text: '#dc2626' },
    dark: { bg: '#3f1f1f', text: '#fca5a5' },
  },
  info: {
    light: { bg: '#EFF3F9', text: '#3A5BA0' },  // Slate Blue
    dark: { bg: '#1e3a5f', text: '#8DA8D5' },
  },
};

// Helper function to get theme-aware text color
export function getTextColor(isDark: boolean, variant: 'primary' | 'secondary' | 'muted' | 'subtle' = 'primary'): string {
  return isDark ? THEME_TEXT.dark[variant] : THEME_TEXT.light[variant];
}

// Helper function to get theme-aware background
export function getBackground(isDark: boolean, variant: 'card' | 'cardAlt' | 'page' = 'card'): string {
  return isDark ? BACKGROUNDS.dark[variant] : BACKGROUNDS.light[variant];
}

// Helper function to get status colors
export function getStatusColors(isDark: boolean, status: 'success' | 'warning' | 'error' | 'info') {
  return isDark ? STATUS[status].dark : STATUS[status].light;
}
