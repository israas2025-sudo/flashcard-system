/**
 * Design tokens — every color, spacing, font size, shadow, border radius,
 * and animation duration as named constants. No magic numbers anywhere.
 */

// === COLORS ===
export const colors = {
  // Neutral base palette
  white: '#FFFFFF',
  offWhite: '#F7F7F8',
  background: '#FFFFFF',
  backgroundSecondary: '#F7F7F8',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Primary accent
  primary: '#6366F1',      // Calm indigo-blue
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryAlpha10: 'rgba(99, 102, 241, 0.10)',
  primaryAlpha15: 'rgba(99, 102, 241, 0.15)',

  // Language accent colors
  arabic: '#F59E0B',       // Warm amber
  arabicLight: '#FCD34D',
  quran: '#14B8A6',        // Deep teal
  quranLight: '#5EEAD4',
  spanish: '#F97316',      // Vibrant coral
  spanishLight: '#FDBA74',
  english: '#64748B',      // Cool slate
  englishLight: '#94A3B8',
  egyptian: '#8B5CF6',     // Purple
  egyptianLight: '#A78BFA',

  // Rating button colors
  again: '#EF4444',        // Muted red
  againLight: '#FCA5A5',
  hard: '#F59E0B',         // Amber
  hardLight: '#FCD34D',
  good: '#6366F1',         // Accent (indigo)
  goodLight: '#818CF8',
  easy: '#22C55E',         // Green
  easyLight: '#86EFAC',

  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Flag colors
  flag1: '#EF4444',  // Red
  flag2: '#F97316',  // Orange
  flag3: '#22C55E',  // Green
  flag4: '#3B82F6',  // Blue
  flag5: '#EC4899',  // Pink
  flag6: '#14B8A6',  // Turquoise
  flag7: '#8B5CF6',  // Purple

  // Status colors
  paused: '#FEF3C7',       // Yellow tint for paused rows
  pausedText: '#92400E',
  marked: '#F3E8FF',       // Purple tint for marked
  markedText: '#6B21A8',
  leech: '#FEE2E2',        // Red tint for leeches
  leechText: '#991B1B',

  // Dark mode overrides
  dark: {
    background: '#0F0F1A',
    backgroundSecondary: '#1A1A2E',
    textPrimary: '#E5E5E7',
    textSecondary: '#9CA3AF',
    border: '#374151',
    borderLight: '#1F2937',
  }
} as const;

// === TYPOGRAPHY ===
export const typography = {
  fontFamily: {
    ui: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    arabicClassical: '"Amiri", "KFGQPC Uthman Taha Naskh", serif',
    arabicQuran: '"KFGQPC Uthmanic Script HAFS", "Amiri Quran", serif',
    arabicEgyptian: '"Noto Naskh Arabic", "Amiri", serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: '11px',
    sm: '13px',     // Body text
    base: '15px',   // Subheadings
    lg: '17px',
    xl: '20px',     // Section headers
    '2xl': '24px',
    '3xl': '28px',  // Page titles
    '4xl': '36px',  // Large display
    '5xl': '48px',  // Hero numbers (streak count, level)
    arabic: '28px', // Arabic card content (larger for readability)
    arabicLarge: '36px', // Quran ayah text
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    arabic: '2.0',  // Arabic needs more line height for diacritics
  },
} as const;

// === SPACING ===
export const spacing = {
  px: '1px',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',     // Gap between list items
  5: '20px',
  6: '24px',     // Minimum container padding
  8: '32px',
  10: '40px',
  12: '48px',    // Major section separation
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// === BORDERS & RADIUS ===
export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',     // Cards, containers
  xl: '16px',
  full: '9999px', // Pills, avatars
} as const;

// === SHADOWS ===
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
  base: '0 1px 3px rgba(0, 0, 0, 0.08)',  // Cards
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
} as const;

// === ANIMATION ===
export const animation = {
  duration: {
    instant: '50ms',
    fast: '100ms',       // Button press
    normal: '200ms',     // Page transitions
    slow: '400ms',       // Card flip
    celebration: '2000ms', // Confetti
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// === LAYOUT ===
export const layout = {
  maxContentWidth: '720px',
  sidebarWidth: '280px',
  cardHeight: '60vh',
  progressBarHeight: '3px',
  touchTarget: '48px',     // Minimum touch target
  touchTargetRecommended: '60px',
} as const;

// === Z-INDEX ===
export const zIndex = {
  base: 0,
  card: 10,
  sidebar: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
} as const;

// === BREAKPOINTS ===
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;
