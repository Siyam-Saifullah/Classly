// ============================================================
// CLASSLY — Add Course Modal
// Premium UI to add a new course with multiple teachers.
// ============================================================
import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';
import { Colors } from '@/theme';
import { generateId } from '@/utils/ids';
import { createCourse, createTeacher } from '@/database/courses';
import type { Course, Teacher } from '@/types';

export default function AddCourseModal() {
  const theme = useTheme();
  const { activeSemester } = useAppStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState('');
  const [credit, setCredit] = useState('');
  const [color, setColor] = useState(Colors.courseColors[0]);

  const [teacherNames, setTeacherNames] = useState<string[]>(['']);

  async function handleSave() {
    if (!activeSemester) return;
    if (!name.trim()) {
      Alert.alert('Course Name', 'Please enter a course name.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const validTeachers = teacherNames.map(t => t.trim()).filter(Boolean);
      
      const teacherObjects: Teacher[] = [];
      for (const tName of validTeachers) {
        const teacher: Teacher = {
          id: generateId('tea'),
          name: tName,
          createdAt: now,
        };
        await createTeacher(teacher);
        teacherObjects.push(teacher);
      }

      const course: Course = {
        id: generateId('crs'),
        semesterId: activeSemester.id,
        name: name.trim(),
        code: code.trim() || undefined,
        room: room.trim() || undefined,
        credit: credit ? parseFloat(credit) : undefined,
        color: color as any,
        defaultDurationMinutes: 60,
        createdAt: now,
        teachers: teacherObjects,
        // Legacy fallback
        teacherId: teacherObjects.length > 0 ? teacherObjects[0].id : undefined,
      };

      await createCourse(course);
      router.back();
    } catch (error) {
      console.error('Failed to add course:', error);
      Alert.alert('Error', 'Failed to add course.');
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: 16, color: theme.colors.textSecondary },
    scroll: { padding: 20, paddingBottom: 80 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 10,
    },
    row: { flexDirection: 'row', gap: 10 },
    colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    colorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: theme.colors.text,
    },
    teacherRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    removeTeacherBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.semantic.critical + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeTeacherText: { color: theme.semantic.critical, fontWeight: 'bold' },
    addTeacherBtn: {
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.brand.primary,
      borderStyle: 'dashed',
      marginBottom: 16,
    },
    addTeacherBtnText: { color: theme.brand.primary, fontWeight: '600' },
    saveBtn: {
      backgroundColor: theme.brand.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
      ...theme.shadows.neon,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <Text style={s.title}>Add Course</Text>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.sectionLabel}>Course Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mathematics"
            placeholderTextColor={theme.colors.placeholder}
            autoFocus
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>Code (optional)</Text>
              <TextInput
                style={s.input}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. MAT 101"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={s.sectionLabel}>Credits</Text>
              <TextInput
                style={s.input}
                value={credit}
                onChangeText={setCredit}
                placeholder="3.0"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
          </View>

          <Text style={s.sectionLabel}>Default Room (optional)</Text>
          <TextInput
            style={s.input}
            value={room}
            onChangeText={setRoom}
            placeholder="e.g. Hall 4"
            placeholderTextColor={theme.colors.placeholder}
          />

          <Text style={s.sectionLabel}>Teachers</Text>
          {teacherNames.map((t, idx) => (
            <View key={idx} style={s.teacherRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={t}
                onChangeText={(val) => {
                  const newT = [...teacherNames];
                  newT[idx] = val;
                  setTeacherNames(newT);
                }}
                placeholder="Teacher Name"
                placeholderTextColor={theme.colors.placeholder}
              />
              {teacherNames.length > 1 && (
                <TouchableOpacity
                  style={s.removeTeacherBtn}
                  onPress={() => {
                    const newT = [...teacherNames];
                    newT.splice(idx, 1);
                    setTeacherNames(newT);
                  }}
                >
                  <Text style={s.removeTeacherText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={s.addTeacherBtn}
            onPress={() => setTeacherNames([...teacherNames, ''])}
          >
            <Text style={s.addTeacherBtnText}>+ Add Another Teacher</Text>
          </TouchableOpacity>

          <Text style={s.sectionLabel}>Color</Text>
          <View style={s.colorRow}>
            {Colors.courseColors.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  s.colorDot,
                  { backgroundColor: c },
                  color === c && s.colorDotSelected,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>✅ Save Course</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
