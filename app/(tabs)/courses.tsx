// ============================================================
// CLASSLY — Courses Screen (Dark Theme Match)
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

import { useAppStore } from '@/store/appStore';

import { getCoursesBySemester } from '@/database/courses';
import { getAttendanceByCourse } from '@/database/attendance';
import { getClassSessionsByCourse } from '@/database/classes';
import { buildAttendanceStats } from '@/utils/attendance';

import type { Course, Teacher, AttendanceStats } from '@/types';

// ── Shared dark token set (matches Calendar & Attendance) ──────────────────
const T = {
  bg: '#09090B',
  card: '#18181B',
  cardDeep: '#111113',
  border: '#27272A',
  text: '#FFFFFF',
  textSub: '#A1A1AA',
  textDim: '#52525B',
  brand: '#8B5CF6',
  brandLight: 'rgba(139,92,246,0.15)',
  brandBorder: 'rgba(139,92,246,0.3)',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.15)',
  amber: '#F59E0B',
  amberLight: 'rgba(245,158,11,0.15)',
  red: '#F43F5E',
  redLight: 'rgba(244,63,94,0.15)',
};

interface TeacherStats {
  teacher: Teacher | { id: string; name: string };
  stats: AttendanceStats;
}

interface CourseWithData {
  course: Course;
  teacherStats: TeacherStats[];
}

function getStatusColor(pct: number) {
  if (pct >= 75) return { main: T.green, light: T.greenLight };
  if (pct >= 60) return { main: T.amber, light: T.amberLight };
  return { main: T.red, light: T.redLight };
}

export default function CoursesScreen() {
  const { activeSemester } = useAppStore();
  const [courses, setCourses] = useState<CourseWithData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!activeSemester) return;
        try {
          const rawCourses = await getCoursesBySemester(activeSemester.id);
          const withData: CourseWithData[] = await Promise.all(
            rawCourses.map(async (course) => {
              const [records, sessions] = await Promise.all([
                getAttendanceByCourse(course.id),
                getClassSessionsByCourse(course.id),
              ]);
              const allTeachers =
                course.teachers && course.teachers.length > 0
                  ? course.teachers
                  : [{ id: 'unassigned', name: 'Unassigned Teacher' }];

              const teacherStats: TeacherStats[] = allTeachers.map((t) => {
                const teacherRecords = records.filter((r) => {
                  const session = sessions.find((s) => s.id === r.classSessionId);
                  if (session?.teacherId) return session.teacherId === t.id;
                  return t.id === 'unassigned';
                });
                const stats = buildAttendanceStats(
                  course,
                  teacherRecords,
                  activeSemester.attendanceRequirement
                );
                return { teacher: t, stats };
              });
              return { course, teacherStats };
            })
          );
          setCourses(withData);
        } catch (err) {
          console.error('[Courses] Load failed:', err);
        } finally {
          setIsLoaded(true);
        }
      }
      load();
    }, [activeSemester?.id])
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Courses</Text>
          {activeSemester && <Text style={s.semesterTag}>{activeSemester.name}</Text>}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/modals/addCourse')}>
          <Text style={s.addBtnIcon}>+</Text>
          <Text style={s.addBtnText}>Add Course</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoaded && courses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📚</Text>
            <Text style={s.emptyText}>
              You haven't added any courses yet.{'\n'}Add your first course to get started.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/onboarding')}>
              <Text style={s.emptyBtnText}>Set Up Semester</Text>
            </TouchableOpacity>
          </View>
        ) : (
          courses.map(({ course, teacherStats }) => (
            <View key={course.id} style={s.courseGroup}>
              {/* Course group header */}
              <View style={s.courseGroupHeader}>
                <View style={[s.courseColorAccent, { backgroundColor: course.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.groupCourseName}>{course.name}</Text>
                  {course.code && (
                    <Text style={[s.groupCourseCode, { color: course.color }]}>{course.code}</Text>
                  )}
                </View>
                {course.credit && (
                  <View style={s.creditPill}>
                    <Text style={s.creditPillText}>{course.credit} cr</Text>
                  </View>
                )}
              </View>

              {/* Teacher sub-cards */}
              {teacherStats.map(({ teacher, stats }) => {
                const sc = getStatusColor(stats.percentage);
                const req = activeSemester?.attendanceRequirement ?? 60;
                const above = stats.percentage - req;
                return (
                  <Pressable
                    key={teacher.id}
                    style={[s.card, { borderColor: `${course.color}40` }]}
                    onPress={() => router.push(`/course/${course.id}`)}
                  >
                    {/* Top row */}
                    <View style={s.cardTop}>
                      <View style={s.cardTopLeft}>
                        <View style={[s.avatarIcon, { backgroundColor: `${course.color}20`, borderColor: `${course.color}40` }]}>
                          <Text style={{ fontSize: 16 }}>👤</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.teacherName}>{teacher.name}</Text>
                          {course.room && (
                            <Text style={s.teacherSub}>🏫 Room {course.room}</Text>
                          )}
                        </View>
                      </View>
                      <View style={s.cardTopRight}>
                        <Text style={[s.pctVal, { color: sc.main }]}>{stats.percentage.toFixed(1)}%</Text>
                        <View style={[s.statusPill, { backgroundColor: sc.light, borderColor: sc.main }]}>
                          <Text style={[s.statusPillText, { color: sc.main }]}>
                            {stats.percentage >= req ? `${Math.max(0, stats.canMiss)} Safe Skips` : 'Danger'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={s.progressContainer}>
                      <View style={s.progressTextRow}>
                        <Text style={[s.progressLabel, above < 0 ? { color: sc.main } : {}]}>
                          {above < 0 ? `Below ${req}% Threshold` : `Target: ${req}%`}
                        </Text>
                        <Text style={[s.progressResult, { color: sc.main }]}>
                          {above >= 0 ? `+${above.toFixed(0)}% Above Goal` : `Attend Next ${stats.requiresAttend}`}
                        </Text>
                      </View>
                      <View style={s.barBg}>
                        <View style={[s.barMark, { left: `${req}%`, backgroundColor: above < 0 ? sc.main : '#fff' }]} />
                        <View style={[s.barFill, { backgroundColor: sc.main, width: `${Math.min(stats.percentage, 100)}%` }]} />
                      </View>
                    </View>

                    {/* Chips */}
                    <View style={s.chipsRow}>
                      <View style={s.chip}>
                        <Text style={s.chipLabel}>Attended</Text>
                        <Text style={s.chipVal}>{stats.totalAttended}</Text>
                      </View>
                      <View style={s.chip}>
                        <Text style={s.chipLabel}>Held</Text>
                        <Text style={s.chipVal}>{stats.totalHeld}</Text>
                      </View>
                      <View style={s.chip}>
                        <Text style={s.chipLabel}>Missed</Text>
                        <Text style={[s.chipVal, { color: stats.absentCount > 0 ? sc.main : T.textSub }]}>
                          {stats.absentCount}
                        </Text>
                      </View>
                      <View style={[s.chip, { backgroundColor: sc.light, borderColor: sc.main }]}>
                        <Text style={[s.chipLabel, { color: sc.main }]}>Status</Text>
                        <Text style={[s.chipVal, { color: sc.main }]}>
                          {stats.percentage >= req ? 'Safe' : 'At Risk'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  semesterTag: { fontSize: 13, color: T.textSub, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addBtnIcon: { color: '#fff', fontSize: 14, fontWeight: '800' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  // Course group
  courseGroup: { marginBottom: 24 },
  courseGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  courseColorAccent: { width: 4, height: 40, borderRadius: 2 },
  groupCourseName: { fontSize: 18, fontWeight: '800', color: T.text },
  groupCourseCode: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  creditPill: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  creditPillText: { color: T.textSub, fontSize: 11, fontWeight: '600' },

  // Teacher card
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  avatarIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  teacherName: { fontSize: 14, fontWeight: '700', color: T.text },
  teacherSub: { fontSize: 12, color: T.textSub, marginTop: 2 },
  cardTopRight: { alignItems: 'flex-end', gap: 4 },
  pctVal: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Progress bar — inset container exactly matching attendance
  progressContainer: {
    backgroundColor: '#0d0f1a',
    borderWidth: 1,
    borderColor: '#181d2f',
    borderRadius: 12,
    padding: 8,
    marginTop: 12,
  },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 10, color: T.textDim },
  progressResult: { fontSize: 10, fontWeight: '700' },
  barBg: { height: 8, backgroundColor: '#181d2f', borderRadius: 4, position: 'relative', overflow: 'hidden' },
  barMark: { position: 'absolute', top: 0, bottom: 0, width: 2, zIndex: 10 },
  barFill: { height: '100%', borderRadius: 4 },

  // Chips — exact match to attendance chip style
  chipsRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  chip: {
    flex: 1, backgroundColor: '#181d2f',
    borderWidth: 1, borderColor: '#20263b',
    borderRadius: 8, alignItems: 'center', paddingVertical: 5,
  },
  chipLabel: { color: T.textDim, fontSize: 9, fontWeight: '600' },
  chipVal: { fontSize: 12, fontWeight: '700', color: T.text, marginTop: 2 },

  // Empty state
  emptyCard: {
    backgroundColor: T.card, borderRadius: 16, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: T.border, marginTop: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 16, backgroundColor: T.brand,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
