// ============================================================
// CLASSLY — Tab Navigator Layout
// Bottom tabs: Home, Calendar, Courses, Attendance, More
// ============================================================
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { TAB_BAR_HEIGHT } from '@/theme';
import { TouchableOpacity } from 'react-native';

function TabIcon({
  emoji,
  label,
  focused,
}: {
  emoji: string;
  label: string;
  focused: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.emoji, { opacity: focused ? 1 : 0.55 }]}>{emoji}</Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.tabLabel,
          {
            color: focused ? theme.brand.primary : theme.colors.textTertiary,
            fontWeight: focused ? '600' : '400',
            maxWidth: '100%',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const BackButton = () => {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 24, color: theme.brand.primary }}>←</Text>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: theme.colors.tabBar }} />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" label="Calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          href: null, // Hidden from tab bar — accessible via Settings
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Attendance" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="course/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="event/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 68,
  },
  emoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 0,
  },
});
