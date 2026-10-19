// ============================================================
// CLASSLY — Global Search
// Searches courses, events, and class sessions.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';

import { getCoursesBySemester } from '@/database/courses';
import { getEventsBySemester } from '@/database/events';
import { getClassSessionsBySemester } from '@/database/classes';

import { formatTime, formatDate } from '@/utils/classes';
import type { Course, AcademicEvent, ClassSession } from '@/types';

export default function SearchScreen() {
  const theme = useTheme();
  const { activeSemester } = useAppStore();

  const [query, setQuery] = useState('');
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!activeSemester) return;
      const [c, e, cls] = await Promise.all([
        getCoursesBySemester(activeSemester.id),
        getEventsBySemester(activeSemester.id),
        getClassSessionsBySemester(activeSemester.id),
      ]);
      setCourses(c);
      setEvents(e);
      setClasses(cls);
    }
    loadData();
  }, [activeSemester?.id]);

  const q = query.toLowerCase().trim();

  const filteredCourses = q
    ? courses.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.room && c.room.toLowerCase().includes(q))
      )
    : [];

  const filteredEvents = q
    ? events.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        (e.topic && e.topic.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
      )
    : [];

  // Group classes by course for search results to avoid showing 30 identical class sessions
  // Just show the course if the query matches the room or a specific date/time
  const filteredClasses = q
    ? classes.filter((cls) =>
        cls.date.includes(q) ||
        cls.startTime.includes(q) ||
        (cls.room && cls.room.toLowerCase().includes(q))
      )
    : [];
    
  // Unique course IDs from matched classes
  const matchedCourseIdsFromClasses = Array.from(new Set(filteredClasses.map(c => c.courseId)));
  const matchedCoursesFromClasses = matchedCourseIdsFromClasses.map(id => courses.find(c => c.id === id)).filter(Boolean) as Course[];

  const EVENT_EMOJIS: Record<string, string> = {
    ct: '📝', assignment: '📄', exam: '📖', event: '🗓️', class: '📚'
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 12,
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
    searchBar: {
      flex: 1,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1.5,
      borderColor: theme.brand.primary,
    },
    scroll: { paddingHorizontal: 16, paddingBottom: 100 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 20,
      marginBottom: 10,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardIcon: { fontSize: 24 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    cardSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
  });

  const allMatchedCourses = Array.from(new Set([...filteredCourses, ...matchedCoursesFromClasses]));

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={s.searchBar}
          placeholder="Search courses, events, rooms..."
          placeholderTextColor={theme.colors.placeholder}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        {q.length > 0 ? (
          <>
            {allMatchedCourses.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Courses</Text>
                {allMatchedCourses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.card, { borderLeftWidth: 4, borderLeftColor: c.color }]}
                    onPress={() => router.push(`/course/${c.id}`)}
                  >
                    <Text style={s.cardIcon}>📚</Text>
                    <View style={s.cardInfo}>
                      <Text style={s.cardTitle}>{c.name} {c.code ? `(${c.code})` : ''}</Text>
                      <Text style={s.cardSub}>{c.room ? `Room ${c.room}` : 'Course'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {filteredEvents.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Events & Assignments</Text>
                {filteredEvents.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={s.card}
                    onPress={() => router.push(`/event/${e.id}` as any)}
                  >
                    <Text style={s.cardIcon}>{EVENT_EMOJIS[e.type] ?? '📌'}</Text>
                    <View style={s.cardInfo}>
                      <Text style={s.cardTitle}>{e.title}</Text>
                      <Text style={s.cardSub}>
                        {formatDate(e.date)}
                        {e.time ? ` · ${formatTime(e.time)}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {allMatchedCourses.length === 0 && filteredEvents.length === 0 && (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>No results found for "{query}"</Text>
              </View>
            )}
          </>
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>Start typing to search...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
