export const Colors = {
  background: '#0A0F1E',
  backgroundCard: '#111827',
  backgroundCardAlt: '#1A2235',
  backgroundElevated: '#1F2D45',

  primary: '#3B82F6',
  primaryBright: '#60A5FA',
  primaryDeep: '#2563EB',
  primaryMuted: 'rgba(59, 130, 246, 0.15)',
  primaryBorder: 'rgba(59, 130, 246, 0.35)',
  primaryGlow: 'rgba(59, 130, 246, 0.50)',

  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textAccent: '#60A5FA',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  tabBarBg: '#0D1526',
  tabBarBorder: 'rgba(59, 130, 246, 0.12)',

  mapOverlay: 'rgba(10, 15, 30, 0.85)',
  routeLine: '#3B82F6',
  routeGlow: 'rgba(59, 130, 246, 0.6)',

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(59, 130, 246, 0.40)',
} as const;

export const Shadows = {
  neonBlue: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  neonBlueSubtle: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
