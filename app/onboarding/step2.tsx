// ============================================================
// CLASSLY — Onboarding Step 2: Department
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { onboardingData, StepProgress, buildStyles } from './_shared';

export default function OnboardingStep2() {
  const theme = useTheme();
  const [department, setDepartment] = useState(onboardingData.department);
  const s = buildStyles(theme);

  function handleNext() {
    if (!department.trim()) return;
    onboardingData.department = department.trim();
    router.push('/onboarding/step3');
  }

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

          <StepProgress current={2} total={5} theme={theme} />

          <Text style={s.title}>Your Department 🏫</Text>
          <Text style={s.subtitle}>
            Which department are you studying in?
          </Text>

          <Text style={s.label}>Department / Faculty</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Computer Science & Engineering"
            placeholderTextColor={theme.colors.placeholder}
            value={department}
            onChangeText={setDepartment}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />

          <TouchableOpacity
            style={[s.nextBtn, !department.trim() && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!department.trim()}
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
