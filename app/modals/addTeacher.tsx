// ============================================================
// CLASSLY — Add Teacher Modal
// Premium UI to add a new or existing teacher to a course.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { getDb } from '@/database/db';
import { getAllTeachers, createTeacher, getCourseById } from '@/database/courses';
import { generateId } from '@/utils/ids';
import type { Teacher, Course } from '@/types';

export default function AddTeacherModal() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const theme = useTheme();

  const [course, setCourse] = useState<Course | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (courseId) {
        const c = await getCourseById(courseId);
        setCourse(c);
      }
      const allTeachers = await getAllTeachers();
      setTeachers(allTeachers);
    }
    load();
  }, [courseId]);

  async function handleAddExisting(teacherId: string) {
    if (!courseId) return;
    try {
      setSaving(true);
      const db = getDb();
      await db.runAsync(
        'INSERT OR IGNORE INTO course_teachers (course_id, teacher_id) VALUES (?, ?)',
        [courseId, teacherId]
      );
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not add teacher.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNew() {
    if (!newTeacherName.trim() || !courseId) return;
    try {
      setSaving(true);
      const teacher: Teacher = {
        id: generateId('tea'),
        name: newTeacherName.trim(),
        createdAt: new Date().toISOString(),
      };
      await createTeacher(teacher);
      const db = getDb();
      await db.runAsync(
        'INSERT OR IGNORE INTO course_teachers (course_id, teacher_id) VALUES (?, ?)',
        [courseId, teacher.id]
      );
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not create and add teacher.');
    } finally {
      setSaving(false);
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
    },
    title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: 18, color: theme.colors.textSecondary },
    scroll: { padding: 24, paddingBottom: 80 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 16,
      marginTop: 24,
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 12,
    },
    addBtn: {
      backgroundColor: theme.brand.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      ...theme.shadows.neon,
    },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    teacherCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    teacherName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    selectBtn: {
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    selectBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.brand.primary,
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>Add Teacher</Text>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[s.sectionTitle, { marginTop: 0 }]}>Create New Teacher</Text>
          <TextInput
            style={s.input}
            value={newTeacherName}
            onChangeText={setNewTeacherName}
            placeholder="e.g. Prof. Smith"
            placeholderTextColor={theme.colors.placeholder}
          />
          <TouchableOpacity style={s.addBtn} onPress={handleAddNew} disabled={saving}>
            <Text style={s.addBtnText}>+ Add to Course</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
