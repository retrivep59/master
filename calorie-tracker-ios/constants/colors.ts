export const Colors = {
  // Primary palette
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  primaryDeep: '#009950',
  primaryMuted: 'rgba(0, 255, 136, 0.12)',
  primaryGlow: 'rgba(0, 255, 136, 0.35)',
  primaryBorder: 'rgba(0, 255, 136, 0.25)',

  // Backgrounds
  background: '#FFFFFF',
  backgroundTint: '#F7FFF9',
  backgroundCard: '#FFFFFF',

  // Dark
  dark: '#0A1A0F',
  darkSecondary: '#1C3027',

  // Text
  text: '#0A1A0F',
  textSecondary: '#4A6855',
  textMuted: '#8AA896',
  textInverse: '#FFFFFF',

  // Borders & surfaces
  border: '#E3F2E9',
  borderLight: '#F0FAF3',
  surface: '#F7FFF9',

  // Semantic
  success: '#00FF88',
  warning: '#FFB800',
  error: '#FF4757',
  info: '#00C9FF',

  // Macros
  protein: '#00C9FF',
  carbs: '#FFB800',
  fat: '#FF6B6B',
  fiber: '#A78BFA',

  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(0, 255, 136, 0.18)',
  glassOverlay: 'rgba(7, 26, 15, 0.45)',

  // Meal type chips
  breakfast: '#FFB800',
  lunch: '#00C9FF',
  dinner: '#A78BFA',
  snack: '#FF6B6B',
} as const;

export const Shadows = {
  card: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  neon: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  subtle: {
    shadowColor: '#0A1A0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
