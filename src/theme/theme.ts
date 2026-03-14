// Alpha Bucks Design System
export const Colors = {
  // Primary palette - deep navy to vibrant gold
  background: '#0A0E1A',
  backgroundSecondary: '#111729',
  backgroundTertiary: '#1A2138',
  surface: '#1E2642',
  surfaceLight: '#2A3456',

  // Accent colors
  primary: '#FFD700',       // Gold
  primaryDark: '#C5A600',
  primaryLight: '#FFE44D',
  secondary: '#7C5CFC',     // Purple
  secondaryLight: '#9B82FC',
  accent: '#00E5FF',        // Cyan
  accentGreen: '#00E676',   // Success green
  accentRed: '#FF5252',     // Error red
  accentOrange: '#FF9100',  // Warning orange

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textTertiary: '#78909C',
  textDark: '#0A0E1A',

  // Game-specific
  timerGreen: '#00E676',
  timerYellow: '#FFD700',
  timerRed: '#FF5252',
  correctAnswer: '#00E676',
  wrongAnswer: '#FF5252',
  skippedAnswer: '#78909C',

  // Glassmorphism
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBackground: 'rgba(30, 38, 66, 0.7)',
  glassShadow: 'rgba(0, 0, 0, 0.3)',

  // Gradients (start, end)
  gradientPrimary: ['#FFD700', '#FF9100'] as [string, string],
  gradientSecondary: ['#7C5CFC', '#00E5FF'] as [string, string],
  gradientDanger: ['#FF5252', '#FF1744'] as [string, string],
  gradientSuccess: ['#00E676', '#00C853'] as [string, string],
  gradientDark: ['#1A2138', '#0A0E1A'] as [string, string],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const Typography = {
  // Font sizes
  display: { fontSize: 64, fontWeight: '800' as const, letterSpacing: -2 },
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '500' as const },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// Game mode configurations
export const GameModeConfig = {
  practice: {
    label: 'Practice',
    icon: '🎯',
    description: 'No pressure, just practice',
    timer: 30,
    color: Colors.accent,
    gradient: Colors.gradientSecondary,
  },
  ranked: {
    label: 'Ranked',
    icon: '🏆',
    description: 'Compete for the leaderboard',
    timer: 30,
    color: Colors.primary,
    gradient: Colors.gradientPrimary,
  },
  daily: {
    label: 'Daily Challenge',
    icon: '📅',
    description: 'Same puzzle for everyone',
    timer: 30,
    color: Colors.accentOrange,
    gradient: ['#FF9100', '#FF6D00'] as [string, string],
  },
  relax: {
    label: 'Relax',
    icon: '🧘',
    description: 'No timer, take your time',
    timer: 0,
    color: Colors.accentGreen,
    gradient: Colors.gradientSuccess,
  },
  hardcore: {
    label: 'Hardcore',
    icon: '💀',
    description: '20 seconds, harder letters',
    timer: 20,
    color: Colors.accentRed,
    gradient: Colors.gradientDanger,
  },
} as const;

export type GameMode = keyof typeof GameModeConfig;
