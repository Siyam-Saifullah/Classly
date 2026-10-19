// ============================================================
// CLASSLY — Onboarding Step 4: Attendance Requirement
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { onboardingData, StepProgress, buildStyles } from './_shared';
import { DEFAULT_ATTENDANCE_REQUIREMENT } from '@/theme';

const COMMON_REQUIREMENTS = [60, 70, 75, 80, 85];

export default function OnboardingStep4() {
  const theme = useTheme();
  const [requirement, setRequirement] = useState(
    onboardingData.attendanceRequirement || DEFAULT_ATTENDANCE_REQUIREMENT
  );
  const s = buildStyles(theme);

  const localStyles = StyleSheet.create({
    requirementDisplay: {
      alignItems: 'center',
      marginVertical: 28,
    },
    requirementNum: {
      fontSize: 72,
      fontWeight: '800',
      color: theme.brand.primary,
      lineHeight: 80,
    },
    requirementLabel: {
      fontSize: 20,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    slider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    sliderBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sliderBtnText: {
      fontSize: 24,
      color: theme.colors.text,
      fontWeight: '300',
    },
    sliderBar: {
      flex: 1,
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
    },
    sliderFill: {
      height: 8,
      backgroundColor: theme.brand.primary,
      borderRadius: 4,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    quickBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    quickBtnActive: {
      borderColor: theme.brand.primary,
      backgroundColor: theme.brand.primary + '15',
    },
    quickBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    quickBtnTextActive: { color: theme.brand.primary },
    descCard: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    descText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 21,
    },
  });

  function adjust(delta: number) {
    setRequirement((prev) => Math.min(100, Math.max(0, prev + delta)));
  }

  function handleNext() {
    onboardingData.attendanceRequirement = requirement;
    router.push('/onboarding/step5');
  }

  const statusColor =
    requirement >= 80
      ? theme.semantic.critical
      : requirement >= 70
      ? theme.semantic.warning
      : theme.semantic.safe;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoArea}>
          <Text style={s.logo}>Classly</Text>
        </View>

        <StepProgress current={4} total={5} theme={theme} />

        <Text style={s.title}>Attendance Requirement 📊</Text>
        <Text style={s.subtitle}>
          What is the minimum attendance your university requires to sit for exams?
        </Text>

        {/* Big number display */}
        <View style={localStyles.requirementDisplay}>
          <Text style={[localStyles.requirementNum, { color: statusColor }]}>
            {requirement}%
          </Text>
          <Text style={localStyles.requirementLabel}>minimum required</Text>
        </View>

        {/* Adjust buttons */}
        <View style={localStyles.slider}>
          <TouchableOpacity style={localStyles.sliderBtn} onPress={() => adjust(-5)}>
            <Text style={localStyles.sliderBtnText}>−</Text>
          </TouchableOpacity>
          <View style={localStyles.sliderBar}>
            <View
              style={[localStyles.sliderFill, { width: `${requirement}%`, backgroundColor: statusColor }]}
            />
          </View>
          <TouchableOpacity style={localStyles.sliderBtn} onPress={() => adjust(5)}>
            <Text style={localStyles.sliderBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Common presets */}
        <Text style={s.label}>Common Requirements</Text>
        <View style={localStyles.quickRow}>
          {COMMON_REQUIREMENTS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                localStyles.quickBtn,
                requirement === r && localStyles.quickBtnActive,
              ]}
              onPress={() => setRequirement(r)}
            >
              <Text
                style={[
                  localStyles.quickBtnText,
                  requirement === r && localStyles.quickBtnTextActive,
                ]}
              >
                {r}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info card */}
        <View style={localStyles.descCard}>
          <Text style={localStyles.descText}>
            💡 Classly will warn you when your attendance in any course drops near this threshold. You can change this later in Settings.
          </Text>
        </View>

        <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
          <Text style={s.nextBtnText}>Continue →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
