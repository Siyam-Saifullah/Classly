// ============================================================
// CLASSLY — Attendance Screen
// One card per teacher per course. Shows Total, Present, Absent.
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
import { router, useFocusEffect } from 'expo-router';

import { useAppStore } from '@/store/appStore';
import { getCoursesBySemester } from '@/database/courses';
import { getAttendanceByCourse } from '@/database/attendance';
import { getClassSessionsByCourse } from '@/database/classes';
import { buildAttendanceStats } from '@/utils/attendance';

import type { AttendanceStats, Course, Teacher } from '@/types';

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
};

function statusColors(pct: number, req: number) {
  if (pct >= req + 15) return { main: '#10B981', light: 'rgba(16,185,129,0.18)' };
  if (pct >= req)      return { main: '#F59E0B', light: 'rgba(245,158,11,0.18)' };
  return               { main: '#F43F5E', light: 'rgba(244,63,94,0.18)' };
}

interface TeacherCard {
  course: Course;
  teacher: Teacher | { id: string; name: string };
  stats: AttendanceStats;
}

export default function AttendanceScreen() {
  const { activeSemester } = useAppStore();
  const [cards, setCards] = useState<TeacherCard[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!activeSemester) { setLoading(false); return; }
        try {
          const courses = await getCoursesBySemester(activeSemester.id);
          const result: TeacherCard[] = [];

          for (const course of courses) {
            const [records, sessions] = await Promise.all([
              getAttendanceByCourse(course.id),
              getClassSessionsByCourse(course.id),
            ]);

            const teachers: (Teacher | { id: string; name: string })[] =
              course.teachers && course.teachers.length > 0
                ? course.teachers
                : [{ id: 'unassigned', name: 'Unassigned Teacher' }];

            for (const teacher of teachers) {
              // Filter records that belong to this teacher's sessions
              const teacherRecords = records.filter((r) => {
                const session = sessions.find((s) => s.id === r.classSessionId);
                if (session?.teacherId) return session.teacherId === teacher.id;
                // If session has no teacherId, attribute to first/only teacher
                return teachers.indexOf(teacher) === 0;
              });

              const stats = buildAttendanceStats(
                course,
                teacherRecords,
                activeSemester.attendanceRequirement
              );
              result.push({ course, teacher, stats });
            }
          }

          setCards(result);
        } catch (err) {
          console.error('[Attendance] Load failed:', err);
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [activeSemester?.id])
  );

  const req = activeSemester?.attendanceRequirement ?? 75;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ─────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Attendance</Text>
          {activeSemester && <Text style={s.semTag}>{activeSemester.name}</Text>}
        </View>
        <TouchableOpacity style={s.logBtn} onPress={() => router.push('/modals/add')}>
          <Text style={s.logBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Empty States ─────────────────────────── */}
        {!activeSemester && (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyText}>Set up a semester first to track attendance.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/onboarding')}>
              <Text style={s.emptyBtnText}>Set Up Semester</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSemester && !loading && cards.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyText}>No courses yet.{'\n'}Add courses from Settings and mark attendance from Home.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/modals/addCourse')}>
              <Text style={s.emptyBtnText}>+ Add Course</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Teacher Cards ────────────────────────── */}
        <View style={s.list}>
          {cards.map(({ course, teacher, stats }, idx) => {
            const sc = statusColors(stats.percentage, req);
            const above = stats.percentage - req;
            const isDanger = stats.percentage < req;
            const safeSkips = stats.canMiss;

            return (
              <TouchableOpacity
                key={`${course.id}-${teacher.id}-${idx}`}
                style={[s.card, { borderColor: `${course.color}40` }]}
                onPress={() => router.push(`/course/${course.id}?teacherId=${teacher.id}` as any)}
                activeOpacity={0.85}
              >
                {/* ── Course name + color bar ────────── */}
                <View style={s.courseHeader}>
                  <View style={[s.courseColorBar, { backgroundColor: course.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.courseName, { color: course.color }]} numberOfLines={1}>
                      {course.name}
                    </Text>
                    {course.code && (
                      <Text style={s.courseCode} numberOfLines={1}>{course.code}</Text>
                    )}
                  </View>
                </View>

                {/* ── Teacher row ───────────────────── */}
                <View style={s.teacherRow}>
                  <View style={[s.teacherIconBox, { backgroundColor: `${course.color}15`, borderColor: `${course.color}30` }]}>
                    <Text style={{ fontSize: 14 }}>👤</Text>
                  </View>
                  <Text style={s.teacherName} numberOfLines={1}>{teacher.name}</Text>
                  <Text style={[s.pctVal, { color: sc.main }]}>{stats.percentage.toFixed(1)}%</Text>
                  <View style={[s.statusPill, { backgroundColor: sc.light, borderColor: sc.main }]}>
                    <Text style={[s.statusPillText, { color: sc.main }]}>
                      {isDanger ? 'Danger' : `${safeSkips} Skip${safeSkips !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                </View>

                {/* ── Progress Bar ──────────────────── */}
                <View style={s.progressContainer}>
                  <View style={s.progressTextRow}>
                    <Text style={[s.progressLabel, isDanger ? { color: sc.main } : {}]}>
                      {isDanger ? `Below ${req}% Threshold` : `Target: ${req}%`}
                    </Text>
                    <Text style={[s.progressResult, { color: sc.main }]}>
                      {isDanger
                        ? `Attend Next ${stats.requiresAttend}`
                        : `+${above.toFixed(0)}% Above Goal`}
                    </Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barMark, { left: `${req}%`, backgroundColor: isDanger ? sc.main : 'rgba(255,255,255,0.35)' }]} />
                    <View style={[s.barFill, { backgroundColor: sc.main, width: `${Math.min(stats.percentage, 100)}%` }]} />
                  </View>
                </View>

                {/* ── Danger Banner ────────────────── */}
                {isDanger && (
                  <View style={[s.dangerBanner, { backgroundColor: `${sc.main}12`, borderColor: `${sc.main}30` }]}>
                    <Text style={[s.dangerBannerText, { color: sc.main }]}>
                      Attend next {stats.requiresAttend} class{stats.requiresAttend !== 1 ? 'es' : ''} to reach {req}%
                    </Text>
                    <View style={[s.urgentPill, { backgroundColor: `${sc.main}20` }]}>
                      <Text style={[s.urgentText, { color: sc.main }]}>URGENT</Text>
                    </View>
                  </View>
                )}

                {/* ── 3 Chips: Total · Present · Absent ── */}
                <View style={s.chipsRow}>
                  <View style={s.chip}>
                    <Text style={s.chipLabel}>TOTAL</Text>
                    <Text style={s.chipVal}>{stats.totalHeld}</Text>
                  </View>
                  <View style={s.chip}>
                    <Text style={s.chipLabel}>PRESENT</Text>
                    <Text style={[s.chipVal, { color: '#10B981' }]}>{stats.presentCount}</Text>
                  </View>
                  <View style={s.chip}>
                    <Text style={s.chipLabel}>ABSENT</Text>
                    <Text style={[s.chipVal, { color: '#F43F5E' }]}>{stats.absentCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  semTag: { fontSize: 12, color: T.textSub, marginTop: 2 },
  logBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  logBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  scroll: { flex: 1, paddingHorizontal: 16 },
  list: { gap: 14, paddingBottom: 40 },

  emptyCard: {
    backgroundColor: T.card, borderRadius: 16, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: T.border, marginBottom: 20,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 16, backgroundColor: '#7c3aed',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Card
  card: {
    backgroundColor: T.card, borderRadius: 16,
    padding: 16, borderWidth: 1,
  },

  // Course header
  courseHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  courseColorBar: { width: 4, height: 36, borderRadius: 2 },
  courseName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  courseCode: { fontSize: 12, color: T.textSub, marginTop: 2 },

  // Teacher row
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  teacherIconBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  teacherName: { flex: 1, fontSize: 13, fontWeight: '600', color: T.textSub },
  pctVal: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Progress bar
  progressContainer: {
    backgroundColor: T.cardDeep, borderWidth: 1, borderColor: T.borderInner,
    borderRadius: 10, padding: 8, marginBottom: 10,
  },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: 10, color: T.textDim },
  progressResult: { fontSize: 10, fontWeight: '700' },
  barBg: { height: 7, backgroundColor: T.borderInner, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  barMark: { position: 'absolute', top: 0, bottom: 0, width: 2, zIndex: 10 },
  barFill: { height: '100%', borderRadius: 4 },

  // Danger
  dangerBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, marginBottom: 10,
  },
  dangerBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  urgentPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  urgentText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  // 3 Chips
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, backgroundColor: T.borderInner,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 10, alignItems: 'center', paddingVertical: 8,
  },
  chipLabel: { color: T.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  chipVal: { fontSize: 18, fontWeight: '800', color: T.text, marginTop: 3 },
});
