// ============================================================
// CLASSLY — Course Detail Screen
// Shows course info, attendance history, upcoming events.
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
import { AttendanceBadge } from '@/components/AttendanceBadge';
import { ProgressBar } from '@/components/ProgressBar';

import { getCourseById, getTeacherById } from '@/database/courses';
import { getClassSessionsByCourse } from '@/database/classes';
import { getAttendanceByCourse, updateAttendanceStatus } from '@/database/attendance';
import { getEventsByCourse } from '@/database/events';

import { buildAttendanceStats, calculateMissableClasses, calculateRequiredClasses } from '@/utils/attendance';
import { formatTime, formatDate } from '@/utils/classes';

import type { Course, Teacher, ClassSession, AttendanceRecord, AcademicEvent, AttendanceStatus } from '@/types';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '✓ Present',
  absent: '✗ Absent',
  late: '⏰ Late',
  excused: '📋 Excused',
};

const STATUS_COLOR: Record<string, string> = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  excused: '#8b5cf6',
};

const StatsBreakdown = ({ stats }: { stats: any }) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }}>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.semantic.safe }}>{stats.presentCount}</Text>
        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>Present</Text>
      </View>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.semantic.critical }}>{stats.absentCount}</Text>
        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>Absent</Text>
      </View>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.semantic.warning }}>{stats.lateCount}</Text>
        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>Late</Text>
      </View>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: STATUS_COLOR.excused }}>{stats.excusedCount}</Text>
        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>Excused</Text>
      </View>
    </View>
  );
};

export default function CourseDetailScreen() {
  const { id, teacherId: initialTeacherId } = useLocalSearchParams<{ id: string; teacherId?: string }>();
  const theme = useTheme();
  const { activeSemester } = useAppStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(initialTeacherId || null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!id || !activeSemester) return;
        const [c, recs, evts] = await Promise.all([
          getCourseById(id),
          getAttendanceByCourse(id),
          getEventsByCourse(id),
        ]);
        if (!c) return;
        setCourse(c);
        setRecords(recs);
        setEvents(evts);

        const [t, sess] = await Promise.all([
          c.teacherId ? getTeacherById(c.teacherId) : Promise.resolve(null),
          getClassSessionsByCourse(id),
        ]);
        setTeacher(t);
        setSessions(sess);
      }
      load();
    }, [id, activeSemester?.id])
  );

  async function handleStatusChange(recordId: string, status: AttendanceStatus) {
    await updateAttendanceStatus(recordId, status, new Date().toISOString());
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status } : r))
    );
  }

  if (!course) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const req = activeSemester?.attendanceRequirement ?? 60;
  const stats = buildAttendanceStats(course, records, req);
  const canMiss = calculateMissableClasses(stats.totalAttended, stats.totalHeld, req);
  const needsAttend = calculateRequiredClasses(stats.totalAttended, stats.totalHeld, req);

  // Map session id -> attendance record
  const sessionToRecord = new Map(records.map((r) => [r.classSessionId, r]));

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    scroll: { paddingHorizontal: 16, paddingBottom: 100 },
    headerBand: { height: 4, width: '100%' },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    iconBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: '#121522', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: '#20263b',
    },
    iconBtnText: { fontSize: 24, color: '#fff', lineHeight: 28 },
    editBtn: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1,
    },
    editBtnText: { fontSize: 13, fontWeight: '700' },
    titleRow: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    courseName: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
    courseCode: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    infoRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 10,
    },
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#121522',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#20263b',
    },
    infoPillText: { fontSize: 12, color: '#a1a1aa' },
    statsCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    statsTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    bigPct: { fontSize: 36, fontWeight: '800', color: theme.colors.text },
    subText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
    forecastRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    forecastChip: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
    },
    forecastNum: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    forecastLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2, textAlign: 'center' },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 8,
    },
    sessionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    sessionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sessionDate: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    sessionTime: { fontSize: 13, color: theme.colors.textSecondary },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    changeStatusRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
    },
    statusBtn: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 7,
      alignItems: 'center',
      borderWidth: 1,
    },
    statusBtnText: { fontSize: 11, fontWeight: '600' },
    eventCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    eventEmoji: { fontSize: 20 },
    eventTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    eventSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
    emptyText: { fontSize: 14, color: theme.colors.textTertiary, paddingVertical: 12 },
  });

  const EVENT_EMOJIS: Record<string, string> = {
    ct: '📝', assignment: '📄', exam: '📖', presentation: '🎤', lab: '🔬', event: '🗓️',
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Color header band */}
      <View style={[s.headerBand, { backgroundColor: course.color }]} />

      {/* Top action row */}
      <View style={s.topRow}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Text style={s.iconBtnText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.editBtn, { backgroundColor: `${course.color}20`, borderColor: `${course.color}50` }]}
          onPress={() => router.push({ pathname: '/modals/editCourse', params: { id: course.id } } as any)}
        >
          <Text style={[s.editBtnText, { color: course.color }]}>✎ Edit Course</Text>
        </TouchableOpacity>
      </View>

      <View style={s.titleRow}>
        <Text style={s.courseName}>{course.name}</Text>
        {course.code && <Text style={[s.courseCode, { color: course.color }]}>{course.code}</Text>}
        <View style={s.infoRow}>
          {course.teachers && course.teachers.length > 0 ? (
            <View style={[s.infoPill, { borderColor: `${course.color}30` }]}>
              <Text style={s.infoPillText}>
                👤 {course.teachers.map((t) => t.name).join(', ')}
              </Text>
            </View>
          ) : teacher ? (
            <View style={s.infoPill}>
              <Text style={s.infoPillText}>👤 {teacher.name}</Text>
            </View>
          ) : null}
          {course.room && <View style={s.infoPill}><Text style={s.infoPillText}>🏫 {course.room}</Text></View>}
          {course.credit && <View style={s.infoPill}><Text style={s.infoPillText}>⭐ {course.credit} cr</Text></View>}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Attendance stats */}
        <Text style={s.sectionTitle}>Attendance By Teacher</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(course.teachers && course.teachers.length > 0
              ? course.teachers
              : teacher
              ? [teacher]
              : [{ id: 'unassigned', name: 'Unassigned Teacher', createdAt: '' }]
            ).map((t) => {
              const teacherRecords = records.filter((r) => {
                const session = sessions.find((s) => s.id === r.classSessionId);
                // If the session has a teacherId, match it. 
                // If it doesn't have a teacherId but this is the only teacher/unassigned, include it.
                if (session?.teacherId) return session.teacherId === t.id;
                return t.id === teacher?.id || t.id === 'unassigned';
              });
              const tStats = buildAttendanceStats(course, teacherRecords, req);
              return (
                <TouchableOpacity 
                  key={t.id} 
                  style={[
                    s.statsCard, 
                    { width: 300, marginBottom: 0 },
                    selectedTeacherId === t.id && { borderColor: theme.brand.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedTeacherId(selectedTeacherId === t.id ? null : t.id)}
                  activeOpacity={0.9}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 }}>
                    👤 {t.name}
                  </Text>
                  <View style={s.statsTop}>
                    <View>
                      <Text style={s.bigPct}>{tStats.percentage.toFixed(1)}%</Text>
                      <Text style={s.subText}>{tStats.totalAttended} / {tStats.totalHeld} attended</Text>
                    </View>
                    <AttendanceBadge status={tStats.status} percentage={tStats.percentage} />
                  </View>
                  <ProgressBar
                    percentage={tStats.percentage}
                    status={tStats.status}
                    height={8}
                    showRequirementLine
                    requirement={req}
                  />
                  <View style={s.forecastRow}>
                    <View style={s.forecastChip}>
                      <Text style={[s.forecastNum, { color: theme.semantic.safe }]}>{tStats.canMiss}</Text>
                      <Text style={s.forecastLabel}>Can Miss</Text>
                    </View>
                    <View style={s.forecastChip}>
                      <Text style={[s.forecastNum, { color: tStats.status === 'critical' ? theme.semantic.critical : theme.semantic.info }]}>
                        {tStats.requiresAttend}
                      </Text>
                      <Text style={s.forecastLabel}>
                        {tStats.status === 'critical' ? 'Attend to Recover' : 'Required More'}
                      </Text>
                    </View>
                  </View>
                  <StatsBreakdown stats={tStats} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Events (CTs, Assignments, Exams) */}
        {events.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Upcoming Events</Text>
            {events.map((evt) => (
              <TouchableOpacity key={evt.id} style={s.eventCard} onPress={() => router.push(`/event/${evt.id}` as any)}>
                <Text style={s.eventEmoji}>{EVENT_EMOJIS[evt.type] ?? '📌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.eventTitle}>{evt.title}</Text>
                  <Text style={s.eventSub}>{formatDate(evt.date)}{evt.time ? ` · ${formatTime(evt.time)}` : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Attendance history */}
        <Text style={s.sectionTitle}>
          Class History {selectedTeacherId && course.teachers ? `- ${course.teachers.find(t => t.id === selectedTeacherId)?.name || 'Teacher'}` : ''}
        </Text>
        {sessions.length === 0 ? (
          <Text style={s.emptyText}>No classes added yet.</Text>
        ) : (
          sessions
            .slice()
            .reverse()
            .filter(s => {
              if (selectedTeacherId && selectedTeacherId !== 'unassigned') {
                return s.teacherId === selectedTeacherId;
              }
              return true;
            })
            .map((session) => {
              const record = sessionToRecord.get(session.id);
              return (
                <View key={session.id} style={s.sessionCard}>
                  <View style={s.sessionTop}>
                    <View>
                      <Text style={s.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={s.sessionTime}>
                        {formatTime(session.startTime)} – {formatTime(session.endTime)}
                        {session.teacherId && course.teachers && course.teachers.length > 1 && (
                          <Text style={{ fontStyle: 'italic', color: theme.colors.textSecondary }}>
                            {' '}· 👤 {course.teachers.find(t => t.id === session.teacherId)?.name}
                          </Text>
                        )}
                      </Text>
                    </View>
                    {record ? (
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: STATUS_COLOR[record.status] ?? '#64748b' },
                        ]}
                      >
                        <Text style={s.statusBadgeText}>{STATUS_LABEL[record.status]}</Text>
                      </View>
                    ) : (
                      <View style={[s.statusBadge, { backgroundColor: theme.colors.border }]}>
                        <Text style={[s.statusBadgeText, { color: theme.colors.textSecondary }]}>
                          Not Marked
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Change status */}
                  {record && (
                    <View style={s.changeStatusRow}>
                      {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            s.statusBtn,
                            {
                              backgroundColor:
                                record.status === status
                                  ? STATUS_COLOR[status]
                                  : 'transparent',
                              borderColor: STATUS_COLOR[status] ?? theme.colors.border,
                            },
                          ]}
                          onPress={() => handleStatusChange(record.id, status)}
                        >
                          <Text
                            style={[
                              s.statusBtnText,
                              {
                                color:
                                  record.status === status
                                    ? '#fff'
                                    : STATUS_COLOR[status],
                              },
                            ]}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
