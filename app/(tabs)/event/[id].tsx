// ============================================================
// CLASSLY — Event Detail Screen
// Shows event details, allows marking as complete.
// ============================================================
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';

import { getEventById, toggleEventCompleted, deleteEvent } from '@/database/events';
import { getCourseById } from '@/database/courses';
import { formatDate, formatTime } from '@/utils/classes';

import type { AcademicEvent, Course, AcademicEventType } from '@/types';

const EVENT_EMOJIS: Record<AcademicEventType | 'class', string> = {
  class: '📚',
  ct: '📝',
  assignment: '📄',
  exam: '📖',
  presentation: '🎤',
  lab: '🔬',
  project: '🎯',
  event: '🗓️',
  other: '📌',
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  
  const [event, setEvent] = useState<AcademicEvent | null>(null);
  const [course, setCourse] = useState<Course | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!id) return;
        const e = await getEventById(id);
        if (!e) return;
        setEvent(e);

        if (e.courseId) {
          const c = await getCourseById(e.courseId);
          setCourse(c);
        }
      }
      load();
    }, [id])
  );

  async function handleToggleComplete() {
    if (!event) return;
    const newStatus = !event.isCompleted;
    await toggleEventCompleted(event.id, newStatus, new Date().toISOString());
    setEvent({ ...event, isCompleted: newStatus });
  }

  async function handleDelete() {
    if (!event) return;
    await deleteEvent(event.id);
    router.back();
  }

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const emoji = EVENT_EMOJIS[event.type] ?? '📌';
  const color = course?.color || theme.brand.primary;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    headerBand: {
      height: 8,
      width: '100%',
      backgroundColor: color,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    emojiContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: { fontSize: 24 },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginTop: 12 },
    typeLabel: { fontSize: 13, color: theme.colors.textSecondary, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    infoIcon: { fontSize: 16 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 2 },
    infoValue: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    completeBtn: {
      backgroundColor: event.isCompleted ? theme.colors.surfaceVariant : theme.semantic.safe,
      marginHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    completeBtnText: {
      color: event.isCompleted ? theme.colors.text : '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    deleteBtn: {
      marginHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.semantic.critical,
    },
    deleteBtnText: {
      color: theme.semantic.critical,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.headerBand} />
      
      <ScrollView>
        <View style={s.header}>
          <View>
            <Text style={s.typeLabel}>{event.type}</Text>
            <Text style={s.title}>{event.title}</Text>
          </View>
          <View style={s.emojiContainer}>
            <Text style={s.emojiText}>{emoji}</Text>
          </View>
        </View>

        <View style={s.card}>
          {course && (
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>📚</Text>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Course</Text>
                <Text style={s.infoValue}>{course.name}</Text>
              </View>
            </View>
          )}

          <View style={s.infoRow}>
            <Text style={s.infoIcon}>📅</Text>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Date & Time</Text>
              <Text style={s.infoValue}>
                {formatDate(event.date)}
                {event.time ? ` at ${formatTime(event.time)}` : ''}
              </Text>
            </View>
          </View>

          {event.location && (
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>📍</Text>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Location</Text>
                <Text style={s.infoValue}>{event.location}</Text>
              </View>
            </View>
          )}

          {event.topic && (
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>💡</Text>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Topic</Text>
                <Text style={s.infoValue}>{event.topic}</Text>
              </View>
            </View>
          )}
          
          {event.description && (
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>📝</Text>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Description</Text>
                <Text style={s.infoValue}>{event.description}</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.completeBtn} onPress={handleToggleComplete}>
          <Text style={s.completeBtnText}>
            {event.isCompleted ? '↩️ Mark as Incomplete' : '✅ Mark as Complete'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Text style={s.deleteBtnText}>🗑️ Delete Event</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
