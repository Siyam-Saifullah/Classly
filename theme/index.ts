// ============================================================
// CLASSLY — Theme System
// All design tokens. Import Colors, Typography, Spacing, etc.
// ============================================================

export const Colors = {
  // ---- Brand (Luxurious) ----
  primary: '#7C3AED',        // Deep Royal Violet (High Dopamine, Premium)
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  
  // Gold Accent for that high-end touch
  gold: '#D4AF37',

  // ---- Semantic ----
  safe: '#10B981',           // Emerald
  safeLight: '#D1FAE5',
  warning: '#F59E0B',        // Amber
  warningLight: '#FEF3C7',
  critical: '#EF4444',       // Rose Red
  criticalLight: '#FEE2E2',
  info: '#3B82F6',           // Royal Blue
  infoLight: '#DBEAFE',

  // ---- Attendance Status ----
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  excused: '#8b5cf6',

  // ---- Light Mode (Luxurious Clean) ----
  light: {
    background: '#FFFFFF',       // Pure white for that ultra-premium feel
    surface: '#F8F9FA',          // Very subtle off-white for cards
    surfaceElevated: '#FFFFFF',
    surfaceVariant: '#F3F4F6',   // Slightly deeper gray for pills
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: '#111827',             // Near black for sharp typography
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    placeholder: '#D1D5DB',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    card: '#FFFFFF',
    modal: '#FFFFFF',
    inputBackground: '#F9FAFB',
    shadow: 'rgba(17, 24, 39, 0.08)',
  },

  // ---- Dark Mode (OLED Luxury) ----
  dark: {
    background: '#000000',       // True OLED Black
    surface: '#111111',          // Elevated glass-like black
    surfaceElevated: '#1A1A1A',
    surfaceVariant: '#222222',
    border: '#2A2A2A',           // Crisp dark borders
    borderLight: '#1A1A1A',
    text: '#F9FAFB',             // Pure crisp white text
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    placeholder: '#4B5563',
    tabBar: '#0A0A0A',
    tabBarBorder: '#222222',
    card: '#111111',
    modal: '#111111',
    inputBackground: '#171717',
    shadow: 'rgba(0, 0, 0, 0.6)',
  },

  // ---- Course Colors (Premium Vibrant Palette) ----
  courseColors: [
    '#7C3AED', // Deep Royal Violet
    '#F43F5E', // Ruby Rose
    '#10B981', // Emerald Green
    '#F59E0B', // Sunset Gold
    '#3B82F6', // Sapphire Blue
    '#D946EF', // Electric Magenta
    '#06B6D4', // Vibrant Cyan
    '#14B8A6', // Midnight Teal
    '#84CC16', // Neon Lime
    '#94A3B8', // Premium Silver
  ] as const,
} as const;

export const Typography = {
  // Font families — using system fonts for offline-first (no Google Fonts CDN needed)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font sizes (sp)
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
  },

  // Font weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,       // Super rounded corners for premium feel
  '2xl': 32,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 32, // Very soft, large radius shadows
    elevation: 10,
  },
  neon: {
    shadowColor: '#7C3AED', // Deep Royal Violet
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
} as const;

// Tab bar height (safe area is added on top of this)
export const TAB_BAR_HEIGHT = 60;

// Onboarding steps
export const ONBOARDING_STEPS = 5;

// Default attendance requirement
export const DEFAULT_ATTENDANCE_REQUIREMENT = 60;

// Attendance thresholds (relative to requirement)
// e.g. if requirement is 60%:
//   warning = below 70% (10% buffer above requirement)
//   critical = below 60% (at or below requirement)
export const ATTENDANCE_BUFFER_WARNING = 10; // % above requirement
export const ATTENDANCE_BUFFER_SAFE = 15;    // % above requirement for "safe"
