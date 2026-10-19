// ============================================================
// CLASSLY — Onboarding Step 5: Add Courses
// Final step — add courses, then save everything to the DB.
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { onboardingData, StepProgress, buildStyles } from './_shared';
import { Colors } from '@/theme';
import { generateId } from '@/utils/ids';
import { createProfile, createSemester, saveSettings } from '@/database/settings';
import { createCourse, createTeacher } from '@/database/courses';
import { useAppStore } from '@/store/appStore';
import type { Course, Teacher, UserProfile, Semester, AppSettings } from '@/types';

const COURSE_COLORS = Colors.courseColors;

interface CourseInput {
  id: string;
  name: string;
  code: string;
  teacherNames: string[];
  credit: string;
  color: string;
}

function makeCourse(): CourseInput {
  return { id: generateId('c'), name: '', code: '', teacherNames: [''], credit: '', color: COURSE_COLORS[0] };
}

export default function OnboardingStep5() {
  const theme = useTheme();
  const { setProfile, setActiveSemester, setSettings } = useAppStore();

  const [courses, setCourses] = useState<CourseInput[]>([makeCourse()]);
  const [saving, setSaving] = useState(false);
  const s = buildStyles(theme);

  const localStyles = StyleSheet.create({
    courseCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    courseCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    courseNum: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    removeBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    removeBtnText: { fontSize: 20, color: theme.semantic.critical },
    colorRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    colorDot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorDotSelected: {
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    addBtn: {
      borderWidth: 1.5,
      borderColor: theme.brand.primary,
      borderStyle: 'dashed',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 24,
    },
    addBtnText: {
      color: theme.brand.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    optionalLabel: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginLeft: 4,
    },
    inputSm: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
      marginTop: 6,
    },
    row2: { flexDirection: 'row', gap: 8 },
  });

  function updateCourse(id: string, field: keyof CourseInput, value: string) {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function addCourse() {
    const usedColors = courses.map((c) => c.color);
    const nextColor = COURSE_COLORS.find((c) => !usedColors.includes(c)) ?? COURSE_COLORS[0];
    setCourses((prev) => [...prev, { ...makeCourse(), color: nextColor }]);
  }

  async function handleFinish() {
    const validCourses = courses.filter((c) => c.name.trim());
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profileId = generateId('prof');
      const semesterId = generateId('sem');

      // 1. Create profile
      const profile: UserProfile = {
        id: profileId,
        name: onboardingData.name,
        universityName: onboardingData.universityName,
        department: onboardingData.department,
        avatarColor: '#6366f1',
        createdAt: now,
      };
      await createProfile(profile);

      // 2. Create semester
      const semester: Semester = {
        id: semesterId,
        name: onboardingData.semesterName,
        startDate: onboardingData.startDate || '',
        endDate: onboardingData.endDate || '',
        attendanceRequirement: onboardingData.attendanceRequirement,
        isActive: true,
        createdAt: now,
      };
      await createSemester(semester);

      // 3. Create teachers (unique by name) + courses
      const teacherMap = new Map<string, string>(); // name -> id
      for (const c of validCourses) {
        for (const tName of c.teacherNames) {
          const tNameTrimmed = tName.trim();
          if (tNameTrimmed && !teacherMap.has(tNameTrimmed)) {
            const teacherId = generateId('tea');
            const teacher: Teacher = {
              id: teacherId,
              name: tNameTrimmed,
              createdAt: now,
            };
            await createTeacher(teacher);
            teacherMap.set(tNameTrimmed, teacherId);
          }
        }
      }

      for (const c of validCourses) {
        const courseTeacherObjects: Teacher[] = [];
        for (const tName of c.teacherNames) {
          const tNameTrimmed = tName.trim();
          if (tNameTrimmed) {
            const tId = teacherMap.get(tNameTrimmed)!;
            courseTeacherObjects.push({ id: tId, name: tNameTrimmed, createdAt: now });
          }
        }

        const course: Course = {
          id: generateId('crs'),
          semesterId,
          name: c.name.trim(),
          code: c.code.trim() || undefined,
          teacherId: courseTeacherObjects.length > 0 ? courseTeacherObjects[0].id : undefined,
          teachers: courseTeacherObjects,
          credit: c.credit ? parseFloat(c.credit) : undefined,
          color: c.color as any,
          defaultDurationMinutes: 60,
          createdAt: now,
        };
        await createCourse(course);
      }

      // 4. Save settings
      const settings: AppSettings = {
        notificationsEnabled: true,
        classReminderMinutes: 30,
        assignmentReminderHours: 24,
        ctReminderHours: 24,
        examReminderHours: 48,
        attendanceWarningEnabled: true,
        theme: 'system',
        onboardingCompleted: true,
        activeProfileId: profileId,
        activeSemesterId: semesterId,
      };
      await saveSettings(settings);

      // 5. Update global store
      setProfile(profile);
      setActiveSemester(semester);
      setSettings(settings);

      // 6. Navigate to main app
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[Onboarding] Save failed:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logoArea}>
          <Text style={s.logo}>Classly</Text>
        </View>

        <StepProgress current={5} total={5} theme={theme} />

        <Text style={s.title}>Add Your Courses 📚</Text>
        <Text style={s.subtitle}>
          Add the courses in your semester. You can add or change these later.
        </Text>

        {courses.map((course, i) => (
          <View key={course.id} style={localStyles.courseCard}>
            <View style={localStyles.courseCardHeader}>
              <Text style={localStyles.courseNum}>Course {i + 1}</Text>
              {courses.length > 1 && (
                <TouchableOpacity
                  style={localStyles.removeBtn}
                  onPress={() => removeCourse(course.id)}
                >
                  <Text style={localStyles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Course name */}
            <TextInput
              style={s.input}
              placeholder="Course name *"
              placeholderTextColor={theme.colors.placeholder}
              value={course.name}
              onChangeText={(v) => updateCourse(course.id, 'name', v)}
            />

            {/* Code + Credit */}
            <View style={localStyles.row2}>
              <TextInput
                style={[localStyles.inputSm, { flex: 1 }]}
                placeholder="Code (e.g. MAT 101)"
                placeholderTextColor={theme.colors.placeholder}
                value={course.code}
                onChangeText={(v) => updateCourse(course.id, 'code', v)}
              />
              <TextInput
                style={[localStyles.inputSm, { width: 80 }]}
                placeholder="Credits"
                placeholderTextColor={theme.colors.placeholder}
                value={course.credit}
                onChangeText={(v) => updateCourse(course.id, 'credit', v)}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Teachers */}
            {course.teacherNames.map((tName, idx) => (
              <View key={idx} style={[localStyles.row2, { marginBottom: 6 }]}>
                <TextInput
                  style={[localStyles.inputSm, { flex: 1 }]}
                  placeholder={idx === 0 ? "Teacher name" : "Additional Teacher"}
                  placeholderTextColor={theme.colors.placeholder}
                  value={tName}
                  onChangeText={(v) => {
                    const newNames = [...course.teacherNames];
                    newNames[idx] = v;
                    updateCourse(course.id, 'teacherNames', newNames as any);
                  }}
                />
                {course.teacherNames.length > 1 && (
                  <TouchableOpacity
                    style={{ backgroundColor: theme.semantic.critical + '20', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 }}
                    onPress={() => {
                      const newNames = [...course.teacherNames];
                      newNames.splice(idx, 1);
                      updateCourse(course.id, 'teacherNames', newNames as any);
                    }}
                  >
                    <Text style={{ color: theme.semantic.critical, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={{ paddingVertical: 8, alignItems: 'flex-start' }}
              onPress={() => {
                updateCourse(course.id, 'teacherNames', [...course.teacherNames, ''] as any);
              }}
            >
              <Text style={{ color: theme.brand.primary, fontSize: 13, fontWeight: '600' }}>+ Add Teacher</Text>
            </TouchableOpacity>

            {/* Color picker */}
            <Text style={[s.label, { marginTop: 16 }]}>Color</Text>
            <View style={localStyles.colorRow}>
              {COURSE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    localStyles.colorDot,
                    { backgroundColor: color },
                    course.color === color && localStyles.colorDotSelected,
                  ]}
                  onPress={() => updateCourse(course.id, 'color', color)}
                >
                  {course.color === color && (
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Add another course */}
        <TouchableOpacity style={localStyles.addBtn} onPress={addCourse}>
          <Text style={localStyles.addBtnText}>+ Add Another Course</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.nextBtn, saving && s.nextBtnDisabled]}
          onPress={handleFinish}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.nextBtnText}>🎓 Start Using Classly</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
