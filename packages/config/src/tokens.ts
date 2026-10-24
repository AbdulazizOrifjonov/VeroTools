/**
 * OCKEAN TOOLS design tokens — single source of truth for web, admin and mobile.
 * Colours are derived from the official OCKEAN brand artwork (brand orange #FD8902).
 *
 * brand.500 (#FD8902) — brand accents, icons, focus rings, large surfaces.
 * brand.600 (#E67700) — primary actions with white text (WCAG AA 4.5:1).
 */
export const brand = {
  50: '#FFF9F0',
  100: '#FFEED4',
  200: '#FFDC9E',
  300: '#FFC466',
  400: '#FFA72E',
  500: '#FD8902',
  600: '#E67700',
  700: '#B85B00',
  800: '#8F4400',
  900: '#703500',
  950: '#3D1B00',
} as const;

export const neutral = {
  0: '#FFFFFF',
  50: '#F7F7F8',
  100: '#EFEFF1',
  200: '#E3E3E7',
  300: '#CBCBD2',
  400: '#A0A0AA',
  500: '#75757F',
  600: '#585862',
  700: '#3F3F47',
  800: '#27272C',
  900: '#18181B',
  950: '#0E0E10',
} as const;

export const status = {
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  /** red-700: AA on white (6.5:1) and on dangerSoft (5.3:1); solid fills with white text use #DC2626 */
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
} as const;

export interface ThemeColors {
  background: string;
  foreground: string;
  surface: string;
  surfaceElevated: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  brand: string;
  brandSoft: string;
  brandSoftForeground: string;
  secondary: string;
  secondaryForeground: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  rating: string;
  graphite: string;
  graphiteForeground: string;
}

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  foreground: '#141416',
  surface: '#F6F6F7',
  surfaceElevated: '#FFFFFF',
  muted: '#F2F2F4',
  mutedForeground: '#65656F',
  border: '#E6E6EA',
  input: '#DADAE0',
  primary: brand[600],
  primaryHover: brand[700],
  primaryForeground: '#FFFFFF',
  brand: brand[500],
  brandSoft: brand[50],
  brandSoftForeground: brand[700],
  secondary: '#F0F0F2',
  secondaryForeground: '#18181B',
  success: status.success,
  successSoft: status.successSoft,
  warning: status.warning,
  warningSoft: status.warningSoft,
  danger: status.danger,
  dangerSoft: status.dangerSoft,
  info: status.info,
  infoSoft: status.infoSoft,
  overlay: 'rgba(14,14,16,0.55)',
  rating: '#F59E0B',
  graphite: '#141417',
  graphiteForeground: '#F4F4F5',
};

export const darkColors: ThemeColors = {
  background: '#0E0E10',
  foreground: '#F4F4F5',
  surface: '#151518',
  surfaceElevated: '#1B1B1F',
  muted: '#1E1E22',
  mutedForeground: '#A1A1AB',
  border: '#2A2A30',
  input: '#34343B',
  primary: brand[600],
  primaryHover: '#FFA72E',
  primaryForeground: '#000000',
  brand: '#FD8902',
  brandSoft: '#2D1A04',
  brandSoftForeground: '#FFC466',
  secondary: '#232328',
  secondaryForeground: '#F4F4F5',
  success: '#22C55E',
  successSoft: '#0F2A1A',
  warning: '#F59E0B',
  warningSoft: '#2B200A',
  danger: '#F87171',
  dangerSoft: '#2D1414',
  info: '#60A5FA',
  infoSoft: '#0F1D33',
  overlay: 'rgba(0,0,0,0.65)',
  rating: '#FBBF24',
  graphite: '#0A0A0C',
  graphiteForeground: '#F4F4F5',
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const typography = {
  fontFamily: 'Manrope',
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
  sizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 },
  lineHeights: { tight: 1.15, snug: 1.3, normal: 1.5 },
} as const;

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

export const tokens = { brand, neutral, status, lightColors, darkColors, radius, spacing, typography, motion };
export type Tokens = typeof tokens;
