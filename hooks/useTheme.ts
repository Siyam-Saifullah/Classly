// ============================================================
// useTheme — React hook for accessing theme based on color scheme
// ============================================================
import { useColorScheme } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    colors: palette,
    brand: {
      primary: Colors.primary,
      primaryLight: Colors.primaryLight,
      primaryDark: Colors.primaryDark,
    },
    semantic: {
      safe: Colors.safe,
      safeLight: Colors.safeLight,
      warning: Colors.warning,
      warningLight: Colors.warningLight,
      critical: Colors.critical,
      criticalLight: Colors.criticalLight,
      info: Colors.info,
      infoLight: Colors.infoLight,
      present: Colors.present,
      absent: Colors.absent,
      late: Colors.late,
      excused: Colors.excused,
    },
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
  };
}

export type Theme = ReturnType<typeof useTheme>;
