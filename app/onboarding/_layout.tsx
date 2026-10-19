// ============================================================
// CLASSLY — Onboarding Layout
// Simple stack for the 5-step onboarding wizard.
// ============================================================
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
