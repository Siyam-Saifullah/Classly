// ============================================================
// CLASSLY — Onboarding Step 1: Welcome + University Name
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { onboardingData, StepProgress, buildStyles } from './_shared';

export default function OnboardingStep1() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');

  function handleNext() {
    if (!name.trim() || !university.trim()) return;
    onboardingData.name = name.trim();
    onboardingData.universityName = university.trim();
    router.push('/onboarding/step2');
  }

  const s = buildStyles(theme);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logoArea}>
            <Text style={s.logo}>Classly</Text>
            <Text style={s.tagline}>Your Semester, Organized.</Text>
          </View>

          {/* Progress */}
          <StepProgress current={1} total={5} theme={theme} />

          <Text style={s.title}>Welcome! 👋</Text>
          <Text style={s.subtitle}>
            Let's set up your semester. This takes less than 2 minutes.
          </Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Your Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Rahim"
              placeholderTextColor={theme.colors.placeholder}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              autoFocus
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>University Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. BUET"
              placeholderTextColor={theme.colors.placeholder}
              value={university}
              onChangeText={setUniversity}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </View>

          <TouchableOpacity
            style={[s.nextBtn, (!name.trim() || !university.trim()) && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!name.trim() || !university.trim()}
          >
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

