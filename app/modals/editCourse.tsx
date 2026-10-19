// ============================================================
// CLASSLY — Edit Course Modal
// Full edit form: name, code, room, credit, color, teachers.
// ============================================================
import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { generateId } from '@/utils/ids';
import {
  getCourseById,
  updateCourse,
  createTeacher,
  getAllTeachers,
  deleteTeacher,
} from '@/database/courses';
import type { Course, Teacher, CourseColor } from '@/types';

// ── Design tokens matching the app's dark theme ──────────────
const T = {
  bg: '#090a0f',
  card: '#121522',
  cardDeep: '#0d0f1a',
  border: '#20263b',
  borderInner: '#181d2f',
  text: '#ffffff',
  textSub: '#a1a1aa',
  textDim: '#71717a',
  brand: '#8b5cf6',
  brandLight: 'rgba(139,92,246,0.15)',
  red: '#F43F5E',
  redLight: 'rgba(244,63,94,0.15)',
  green: '#10B981',
};

const COURSE_COLORS: CourseColor[] = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#06b6d4',
];

const COLOR_NAMES: Record<string, string> = {
  '#6366f1': 'Indigo', '#ec4899': 'Pink', '#f59e0b': 'Amber',
  '#10b981': 'Emerald', '#3b82f6': 'Blue', '#8b5cf6': 'Violet',
  '#ef4444': 'Red', '#14b8a6': 'Teal', '#f97316': 'Orange', '#06b6d4': 'Cyan',
};

interface TeacherEntry {
  id: string;      // existing teacher id OR temp id for new ones
  name: string;
  isExisting: boolean;
  isRemoved: boolean;
}

export default function EditCourseModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState('');
  const [credit, setCredit] = useState('');
  const [color, setColor] = useState<CourseColor>('#6366f1');
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const c = await getCourseById(id);
        if (!c) return;
        setCourse(c);
        setName(c.name);
        setCode(c.code ?? '');
        setRoom(c.room ?? '');
        setCredit(c.credit ? String(c.credit) : '');
        setColor(c.color as CourseColor);
        const existingTeachers: TeacherEntry[] = (c.teachers ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          isExisting: true,
          isRemoved: false,
        }));
        if (existingTeachers.length === 0) {
          existingTeachers.push({ id: generateId('tea'), name: '', isExisting: false, isRemoved: false });
        }
        setTeachers(existingTeachers);
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function addTeacher() {
    setTeachers((prev) => [
      ...prev,
      { id: generateId('tea'), name: '', isExisting: false, isRemoved: false },
    ]);
  }

  function removeTeacher(idx: number) {
    setTeachers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, isRemoved: true } : t))
    );
  }

  function updateTeacherName(idx: number, val: string) {
    setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, name: val } : t)));
  }

  async function handleSave() {
    if (!course) return;
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a course name.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const activeTeachers = teachers.filter((t) => !t.isRemoved && t.name.trim());

      // Create any new teachers
      const teacherObjects: Teacher[] = [];
      for (const te of activeTeachers) {
        if (!te.isExisting) {
          const newTeacher: Teacher = { id: te.id, name: te.name.trim(), createdAt: now };
          await createTeacher(newTeacher);
          teacherObjects.push(newTeacher);
        } else {
          teacherObjects.push({
            id: te.id,
            name: te.name.trim(),
            createdAt: '',
          });
        }
      }

      const updated: Course = {
        ...course,
        name: name.trim(),
        code: code.trim() || undefined,
        room: room.trim() || undefined,
        credit: credit ? parseFloat(credit) : undefined,
        color,
        teachers: teacherObjects,
        teacherId: teacherObjects[0]?.id ?? course.teacherId,
      };

      await updateCourse(updated);
      router.back();
    } catch (err) {
      console.error('Failed to update course:', err);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${name}"? This will also remove all related classes and attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { deleteCourse } = await import('@/database/courses');
            if (course) {
              await deleteCourse(course.id);
              router.back();
              router.back(); // back to courses list
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={T.brand} size="large" />
      </View>
    );
  }

  const visibleTeachers = teachers.filter((t) => !t.isRemoved);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* ── Header ──────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>Edit Course</Text>
          <TouchableOpacity
            style={[s.saveHeaderBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveHeaderBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Color preview band ──────────────────────── */}
        <View style={[s.colorBand, { backgroundColor: color }]} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Course Info Section ─────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>COURSE INFO</Text>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Course Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Human-Computer Interaction"
                placeholderTextColor={T.textDim}
              />
            </View>

            <View style={s.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Course Code</Text>
                <TextInput
                  style={s.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="e.g. CS 304"
                  placeholderTextColor={T.textDim}
                />
              </View>
              <View style={{ width: 100 }}>
                <Text style={s.fieldLabel}>Credits</Text>
                <TextInput
                  style={s.input}
                  value={credit}
                  onChangeText={setCredit}
                  placeholder="3.0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={T.textDim}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Default Room</Text>
              <TextInput
                style={s.input}
                value={room}
                onChangeText={setRoom}
                placeholder="e.g. Lecture Hall B"
                placeholderTextColor={T.textDim}
              />
            </View>
          </View>

          {/* ── Color Picker Section ────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>COURSE COLOR</Text>
            <View style={s.colorGrid}>
              {COURSE_COLORS.map((c) => {
                const isSelected = color === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorSwatch, { backgroundColor: c }, isSelected && s.colorSwatchSelected]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Text style={s.colorCheckmark}>✓</Text>}
                    <Text style={s.colorSwatchLabel}>{COLOR_NAMES[c]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Teachers Section ────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>TEACHERS</Text>
            {visibleTeachers.map((t, idx) => (
              <View key={t.id} style={s.teacherRow}>
                <View style={[s.teacherIconBox, { borderColor: `${color}50`, backgroundColor: `${color}15` }]}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <TextInput
                  style={[s.input, s.teacherInput]}
                  value={t.name}
                  onChangeText={(val) => updateTeacherName(teachers.indexOf(t), val)}
                  placeholder="Teacher name"
                  placeholderTextColor={T.textDim}
                />
                <TouchableOpacity
                  style={s.removeTeacherBtn}
                  onPress={() => removeTeacher(teachers.indexOf(t))}
                >
                  <Text style={s.removeTeacherText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addTeacherBtn} onPress={addTeacher}>
              <Text style={[s.addTeacherText, { color }]}>+ Add Teacher</Text>
            </TouchableOpacity>
          </View>

          {/* ── Danger Zone ─────────────────────────────── */}
          <View style={s.dangerSection}>
            <Text style={[s.sectionLabel, { color: T.red }]}>DANGER ZONE</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>🗑 Delete This Course</Text>
            </TouchableOpacity>
          </View>

          {/* ── Save Button ─────────────────────────────── */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: color }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>✅ Save Changes</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.border,
  },
  closeBtnText: { fontSize: 15, color: T.textSub },
  saveHeaderBtn: {
    backgroundColor: T.brand,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  saveHeaderBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Color band
  colorBand: { height: 4, width: '100%' },

  // Scroll content
  scroll: { padding: 20, paddingBottom: 60 },

  // Sections
  section: {
    backgroundColor: T.card,
    borderRadius: 16, borderWidth: 1, borderColor: T.border,
    padding: 16, marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: T.textDim,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },

  // Fields
  fieldGroup: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: T.textSub, marginBottom: 6 },
  input: {
    backgroundColor: T.cardDeep,
    borderRadius: 10, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: T.text,
  },

  // Color picker
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: '18%', aspectRatio: 1,
    borderRadius: 14, alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 6, overflow: 'hidden',
  },
  colorSwatchSelected: {
    borderWidth: 3, borderColor: '#fff',
  },
  colorCheckmark: { fontSize: 18, color: '#fff', fontWeight: '900', position: 'absolute', top: 8 },
  colorSwatchLabel: { fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },

  // Teachers
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  teacherIconBox: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  teacherInput: { flex: 1, marginBottom: 0 },
  removeTeacherBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.redLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
  },
  removeTeacherText: { color: T.red, fontWeight: '800', fontSize: 12 },
  addTeacherBtn: {
    paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.border,
    marginTop: 4,
  },
  addTeacherText: { fontWeight: '700', fontSize: 14 },

  // Danger zone
  dangerSection: {
    backgroundColor: T.redLight,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)',
    padding: 16, marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: 'rgba(244,63,94,0.2)',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.4)',
  },
  deleteBtnText: { color: T.red, fontWeight: '700', fontSize: 15 },

  // Save
  saveBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
