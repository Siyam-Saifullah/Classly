// ============================================================
// CLASSLY — Root Layout
// Initializes database, loads settings, routes to onboarding or main app.
// ============================================================
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from '@/database/db';
import { getSettings, getProfileById, getActiveSemester } from '@/database/settings';
import { useAppStore } from '@/store/appStore';
import { Colors } from '@/theme';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const { setDbReady, setSettings, setProfile, setActiveSemester, setLoading, isLoading } =
    useAppStore();

  useEffect(() => {
    async function initialize() {
      try {
        // 1. Open and migrate the SQLite database
        await initDatabase();
        setDbReady(true);

        // 2. Load settings
        const settings = await getSettings();
        if (settings) {
          setSettings(settings);

          // 3. Load active profile
          if (settings.activeProfileId) {
            const profile = await getProfileById(settings.activeProfileId);
            setProfile(profile);
          }

          // 4. Load active semester
          const semester = await getActiveSemester();
          setActiveSemester(semester);

        }
      } catch (error) {
        console.error('[App] Initialization failed:', error);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.splash,
          { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
        ]}
      >
        <Text style={[styles.logo, { color: Colors.primary }]}>Classly</Text>
        <Text style={[styles.tagline, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Your Semester, Organized.
        </Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#090a0f' } }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modals/add"
            options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="modals/addCourse"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="modals/editCourse"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="modals/addTeacher"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: 8,
    opacity: 0.7,
  },
});
