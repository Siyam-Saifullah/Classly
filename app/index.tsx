import React from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isLoading, settings, isDbReady } = useAppStore();

  if (isLoading || !isDbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090a0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  if (settings?.onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
