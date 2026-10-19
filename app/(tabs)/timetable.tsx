// ============================================================
// CLASSLY — Timetable Screen
// Shows a weekly timetable with classes grouped by day.
// ============================================================
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format, startOfWeek, addDays } from 'date-fns';

import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';

import { getClassSessionsByDateRange } from '@/database/classes';
import { getCoursesBySemester } from '@/database/courses';
import { formatTime } from '@/utils/classes';
import type { ClassSession, Course } from '@/types';

export default function TimetableScreen() {
  const theme = useTheme();
  const { activeSemester } = useAppStore();

  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [courseMap, setCourseMap] = useState<Map<string, Course>>(new Map());
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  
  // Start week from current day (or just use Monday as start of week)
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
  // We'll set the initial selected day to today
  
  // Calculate start of current week (Monday)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday

  useFocusEffect(
    useCallback(() => {
      // Find offset for today
      let todayOffset = currentDayOfWeek - 1;
      if (todayOffset < 0) todayOffset = 6; // Sunday is 6
      setSelectedDayOffset(todayOffset);
    }, [currentDayOfWeek])
  );

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!activeSemester) return;
        try {
          const start = format(weekStart, 'yyyy-MM-dd');
          const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');

          const [fetchedClasses, courses] = await Promise.all([
            getClassSessionsByDateRange(start, end, activeSemester.id),
            getCoursesBySemester(activeSemester.id),
          ]);

          setClasses(fetchedClasses);
          setCourseMap(new Map(courses.map((c) => [c.id, c])));
        } catch (err) {
          console.error('[Timetable] Load failed:', err);
        }
      }
      load();
    }, [activeSemester?.id, weekStart])
  );

  const selectedDate = addDays(weekStart, selectedDayOffset);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const dayClasses = classes
    .filter((c) => c.date === selectedDateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnText: { fontSize: 20, color: theme.colors.text },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    weekSelector: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'space-between',
    },
    dayBtn: {
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    dayBtnActive: {
      backgroundColor: theme.brand.primary + '15',
      borderColor: theme.brand.primary,
    },
    dayLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    dayDate: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    activeText: {
      color: theme.brand.primary,
    },
    scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
    sessionCard: {
      flexDirection: 'row', backgroundColor: '#1E1E28', borderRadius: 14,
      paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1,
    },
    sessionLeft: { width: 62, alignItems: 'center', justifyContent: 'center' },
    sessionDivider: { width: 3, borderRadius: 2, marginHorizontal: 10 },
    sessionRight: { flex: 1, justifyContent: 'center', minHeight: 60 },
    timeStart: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginBottom: 0 },
    timeEnd: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '800' },
    sessionRightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    courseCode: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flex: 1, marginRight: 8 },
    courseTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locText: { fontSize: 12, color: theme.colors.textSecondary },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
  });

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Weekly Timetable</Text>
      </View>

      {/* Day Selector */}
      <View style={s.weekSelector}>
        {Array.from({ length: 7 }).map((_, i) => {
          const date = addDays(weekStart, i);
          const isActive = selectedDayOffset === i;
          return (
            <TouchableOpacity
              key={i}
              style={[s.dayBtn, isActive && s.dayBtnActive]}
              onPress={() => setSelectedDayOffset(i)}
            >
              <Text style={[s.dayLabel, isActive && s.activeText]}>
                {daysOfWeek[i]}
              </Text>
              <Text style={[s.dayDate, isActive && s.activeText]}>
                {format(date, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Classes List */}
      <ScrollView contentContainerStyle={s.scroll}>
        {dayClasses.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🎉</Text>
            <Text style={s.emptyText}>No classes on {daysOfWeek[selectedDayOffset]}!</Text>
          </View>
        ) : (
          dayClasses.map((cls) => {
            const course = courseMap.get(cls.courseId);
            const color = course?.color || theme.brand.primary;
            return (
              <View key={cls.id} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[s.sessionCard, { borderColor: `${color}60`, flexDirection: 'column', alignItems: 'stretch' }]}
                  onPress={() => router.push(cls.teacherId ? `/course/${cls.courseId}?teacherId=${cls.teacherId}` as any : `/course/${cls.courseId}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', width: '100%', height: 74 }}>
                    <View style={s.sessionLeft}>
                      <Text style={{ fontSize: 20, marginBottom: 2 }}>🏫</Text>
                      <Text style={s.timeStart}>{formatTime(cls.startTime)}</Text>
                      {cls.endTime && <Text style={s.timeEnd}>{formatTime(cls.endTime)}</Text>}
                    </View>
                    <View style={[s.sessionDivider, { backgroundColor: color }]} />
                    <View style={s.sessionRight}>
                      <View style={s.sessionRightHeader}>
                        <Text style={[s.courseCode, { color: color, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                          {course?.code ?? 'Course'}
                        </Text>
                      </View>
                      <Text style={s.courseTitle} numberOfLines={1}>{course?.name ?? 'Unknown Course'}</Text>
                      <View style={[s.locRow, { marginTop: 2 }]}>
                        {(cls.room || course?.room) ? (
                          <Text style={s.locText}>📍 {cls.room ?? course?.room}</Text>
                        ) : <View style={{ flex: 1 }} />}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
