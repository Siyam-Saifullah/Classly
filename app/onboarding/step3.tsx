// ============================================================
// CLASSLY — Onboarding Step 3: Semester Setup
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { onboardingData, StepProgress, buildStyles } from './_shared';

import DateTimePicker from '@react-native-community/datetimepicker';

const QUICK_SEMESTERS = [
  { label: '1st Semester' },
  { label: '2nd Semester' },
  { label: '3rd Semester' },
  { label: '4th Semester' },
  { label: '5th Semester' },
  { label: '6th Semester' },
  { label: '7th Semester' },
  { label: '8th Semester' },
];

export default function OnboardingStep3() {
  const theme = useTheme();
  const [semesterName, setSemesterName] = useState(
    onboardingData.semesterName || 'Fall 2026'
  );
  const [startDate, setStartDate] = useState(
    onboardingData.startDate || ''
  );
  const [endDate, setEndDate] = useState(
    onboardingData.endDate || ''
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const s = buildStyles(theme);

  const qStyles = StyleSheet.create({
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    quickBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    quickBtnActive: { borderColor: theme.brand.primary, backgroundColor: theme.brand.primary + '15' },
    quickBtnText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
    quickBtnTextActive: { color: theme.brand.primary, fontWeight: '600' },
    hint: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 6 },
  });

  function selectQuick(semester: typeof QUICK_SEMESTERS[0]) {
    setSemesterName(semester.label);
  }

  function handleNext() {
    if (!semesterName.trim()) return;
    onboardingData.semesterName = semesterName.trim();
    onboardingData.startDate = startDate.trim() || undefined;
    onboardingData.endDate = endDate.trim() || undefined;
    router.push('/onboarding/step4');
  }

  const isValid = semesterName.trim().length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoArea}>
            <Text style={s.logo}>Classly</Text>
          </View>

          <StepProgress current={3} total={5} theme={theme} />

          <Text style={s.title}>Your Semester 📅</Text>
          <Text style={s.subtitle}>
            When does your current semester run?
          </Text>

          {/* Quick select */}
          <Text style={s.label}>Quick Select</Text>
          <View style={qStyles.quickRow}>
            {QUICK_SEMESTERS.map((sem) => (
              <TouchableOpacity
                key={sem.label}
                style={[
                  qStyles.quickBtn,
                  semesterName === sem.label && qStyles.quickBtnActive,
                ]}
                onPress={() => selectQuick(sem)}
              >
                <Text
                  style={[
                    qStyles.quickBtnText,
                    semesterName === sem.label && qStyles.quickBtnTextActive,
                  ]}
                >
                  {sem.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {Platform.OS === 'web' && React.createElement('style', { type: 'text/css' }, `
            input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.8; }
            input[type="date"] { color-scheme: dark; }
          `)}

          <Text style={s.label}>Semester Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Fall 2026"
            placeholderTextColor={theme.colors.placeholder}
            value={semesterName}
            onChangeText={setSemesterName}
          />

          <Text style={s.label}>Start Date (Optional)</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              style: {
                backgroundColor: theme.colors.inputBackground,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '15px',
                color: theme.colors.text,
                marginBottom: '10px',
                outline: 'none',
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box'
              },
              value: startDate,
              onChange: (e: any) => setStartDate(e.target.value)
            })
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[s.input, { justifyContent: 'center' }]}>
                <Text style={{ color: startDate ? theme.colors.text : theme.colors.placeholder }}>
                  {startDate || 'Select Start Date'}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate ? new Date(startDate) : new Date()}
                  mode="date"
                  display="default"
                  onValueChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setStartDate(format(date, 'yyyy-MM-dd'));
                  }}
                  onDismiss={() => setShowStartPicker(false)}
                />
              )}
            </>
          )}

          <Text style={s.label}>End Date (Optional)</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              style: {
                backgroundColor: theme.colors.inputBackground,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '15px',
                color: theme.colors.text,
                marginBottom: '10px',
                outline: 'none',
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box'
              },
              value: endDate,
              onChange: (e: any) => setEndDate(e.target.value)
            })
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowEndPicker(true)} style={[s.input, { justifyContent: 'center' }]}>
                <Text style={{ color: endDate ? theme.colors.text : theme.colors.placeholder }}>
                  {endDate || 'Select End Date'}
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate ? new Date(endDate) : new Date()}
                  mode="date"
                  display="default"
                  onValueChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setEndDate(format(date, 'yyyy-MM-dd'));
                  }}
                  onDismiss={() => setShowEndPicker(false)}
                />
              )}
            </>
          )}

          <TouchableOpacity
            style={[s.nextBtn, !isValid && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isValid}
          >
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
