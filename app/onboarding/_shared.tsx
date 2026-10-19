import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const onboardingData = {
  name: '',
  universityName: '',
  department: '',
  semesterName: '',
  startDate: '',
  endDate: '',
  attendanceRequirement: 60,
  initialCourses: [] as any[], // Temporarily holds courses added in step 5
};

export function StepProgress({
  current,
  total,
  theme,
}: {
  current: number;
  total: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28, alignSelf: 'flex-start' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i + 1 === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              i + 1 <= current ? theme.brand.primary : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}

export function buildStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 40,
      lineHeight: 22,
    },
    inputGroup: { marginBottom: 24 },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 16,
      fontSize: 17,
      color: theme.colors.text,
    },
    nextBtn: {
      backgroundColor: theme.brand.primary,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 'auto',
      shadowColor: theme.brand.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    nextBtnDisabled: {
      backgroundColor: theme.colors.surfaceVariant,
      shadowOpacity: 0,
      elevation: 0,
    },
    nextBtnText: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '700',
    },
  });
}

export default function Shared() {
  return null;
}
