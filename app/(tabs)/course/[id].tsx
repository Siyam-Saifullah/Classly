// ============================================================
// CLASSLY — Course & Teacher Detail Screen
// Focused view for a course and its specific teacher.
// ============================================================
import React, { useCallback, useState, useEffect } from 'react';
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
import { getAttendanceByCourse, updateAttendanceStatus, upsertAttendance } from '@/database/attendance';
import { getEventsByCourse } from '@/database/events';

import { buildAttendanceStats } from '@/utils/attendance';
import { formatTime, formatDate } from '@/utils/classes';
import { generateId } from '@/utils/ids';

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

function statusColors(pct: number, req: number) {
  if (pct >= req + 15) return { main: '#10B981', light: 'rgba(16,185,129,0.18)' };
  if (pct >= req)      return { main: '#F59E0B', light: 'rgba(245,158,11,0.18)' };
  return               { main: '#F43F5E', light: 'rgba(244,63,94,0.18)' };
}

const StatsBreakdown = ({ stats }: { stats: any }) => {
  return (
    <View style={bd.container}>
      <View style={bd.col}>
        <Text style={[bd.num, { color: '#10b981' }]}>{stats.presentCount}</Text>
        <Text style={bd.label}>Present</Text>
      </View>
      <View style={bd.col}>
        <Text style={[bd.num, { color: '#ef4444' }]}>{stats.absentCount}</Text>
        <Text style={bd.label}>Absent</Text>
      </View>
      <View style={bd.col}>
        <Text style={[bd.num, { color: '#f59e0b' }]}>{stats.lateCount}</Text>
        <Text style={bd.label}>Late</Text>
      </View>
      <View style={bd.col}>
        <Text style={[bd.num, { color: '#8b5cf6' }]}>{stats.excusedCount}</Text>
        <Text style={bd.label}>Excused</Text>
      </View>
    </View>
  );
};

const bd = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#181d2f',
  },
  col: { alignItems: 'center', flex: 1 },
  num: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: '#71717a', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },
});

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

  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    }
  }, [initialTeacherId]);

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

  async function handleStatusChange(session: ClassSession, status: AttendanceStatus) {
    const existing = sessionToRecord.get(session.id);
    const now = new Date().toISOString();
    if (existing) {
      await updateAttendanceStatus(existing.id, status, now);
      setRecords((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, status, updatedAt: now } : r))
      );
    } else {
      const newRecord: AttendanceRecord = {
        id: generateId('att'),
        classSessionId: session.id,
        courseId: session.courseId,
        semesterId: session.semesterId,
        date: session.date,
        status,
        createdAt: now,
        updatedAt: now,
      };
      await upsertAttendance(newRecord);
      setRecords((prev) => [...prev, newRecord]);
    }
  }

  if (!course) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090a0f' }}>
        <Text style={{ color: '#a1a1aa' }}>Loading...</Text>
      </View>
    );
  }

  // All teachers associated with this course
  const teachers: (Teacher | { id: string; name: string; department?: string; email?: string; phone?: string })[] =
    course.teachers && course.teachers.length > 0
      ? course.teachers
      : teacher
      ? [teacher]
      : [{ id: 'unassigned', name: 'Unassigned Teacher' }];

  // Active teacher to display (filtered specifically for the clicked teacher card)
  const activeTeacher = selectedTeacherId
    ? teachers.find((t) => t.id === selectedTeacherId) || teachers[0]
    : teachers[0];

  // Filter sessions that belong specifically to this active teacher
  const teacherSessions = sessions.filter((s) => {
    if (s.teacherId) return s.teacherId === activeTeacher.id;
    // If session has no teacherId, attribute to first/only teacher
    return teachers.findIndex((t) => t.id === activeTeacher.id) === 0;
  });

  const teacherSessionIds = new Set(teacherSessions.map((s) => s.id));
  const teacherRecords = records.filter((r) => teacherSessionIds.has(r.classSessionId));

  const req = activeSemester?.attendanceRequirement ?? 75;
  const tStats = buildAttendanceStats(course, teacherRecords, req);
  const sc = statusColors(tStats.percentage, req);
  const above = tStats.percentage - req;
  const isDanger = tStats.percentage < req;

  // Map session id -> attendance record
  const sessionToRecord = new Map(records.map((r) => [r.classSessionId, r]));

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

      {/* Course Title and Active Teacher Header */}
      <View style={s.titleRow}>
        <Text style={s.courseName}>{course.name}</Text>
        {course.code && <Text style={[s.courseCode, { color: course.color }]}>{course.code}</Text>}
        
        {/* Info pills focused on this teacher */}
        <View style={s.infoRow}>
          <View style={[s.infoPill, { borderColor: `${course.color}50`, backgroundColor: `${course.color}15` }]}>
            <Text style={[s.infoPillText, { color: '#ffffff', fontWeight: '700' }]}>
              👤 {activeTeacher.name}
            </Text>
          </View>
          {activeTeacher.department && (
            <View style={s.infoPill}>
              <Text style={s.infoPillText}>🏛️ {activeTeacher.department}</Text>
            </View>
          )}
          {activeTeacher.email && (
            <View style={s.infoPill}>
              <Text style={s.infoPillText}>✉️ {activeTeacher.email}</Text>
            </View>
          )}
          {activeTeacher.phone && (
            <View style={s.infoPill}>
              <Text style={s.infoPillText}>📞 {activeTeacher.phone}</Text>
            </View>
          )}
          {course.room && (
            <View style={s.infoPill}>
              <Text style={s.infoPillText}>🏫 {course.room}</Text>
            </View>
          )}
          {course.credit && (
            <View style={s.infoPill}>
              <Text style={s.infoPillText}>⭐ {course.credit} cr</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Multi-teacher Switcher (if course has multiple teachers, user can switch between them) */}
        {teachers.length > 1 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.sectionTitle}>Course Teachers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {teachers.map((t) => {
                const isSelected = t.id === activeTeacher.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      s.teacherTab,
                      isSelected && { backgroundColor: `${course.color}25`, borderColor: course.color }
                    ]}
                    onPress={() => setSelectedTeacherId(t.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.teacherTabText, isSelected && { color: '#ffffff', fontWeight: '700' }]}>
                      👤 {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Single Focused Teacher Attendance Card ── */}
        <Text style={s.sectionTitle}>Attendance Stats</Text>
        <View style={[s.statsCard, { borderColor: `${course.color}40` }]}>
          {/* Card Top: Teacher identity & Status Badge */}
          <View style={s.teacherCardHeader}>
            <View style={s.teacherCardLeft}>
              <View style={[s.teacherAvatar, { backgroundColor: `${course.color}20`, borderColor: `${course.color}40` }]}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.teacherCardTitle} numberOfLines={1}>{activeTeacher.name}</Text>
                <Text style={s.teacherCardSubtitle}>Attendance Record</Text>
              </View>
            </View>
            <AttendanceBadge status={tStats.status} percentage={tStats.percentage} />
          </View>

          {/* Big percentage & quick status */}
          <View style={s.statsTop}>
            <View>
              <Text style={[s.bigPct, { color: sc.main }]}>{tStats.percentage.toFixed(1)}%</Text>
              <Text style={s.subText}>{tStats.totalAttended} / {tStats.totalHeld} classes attended</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: sc.light, borderColor: sc.main }]}>
              <Text style={[s.statusPillText, { color: sc.main }]}>
                {isDanger ? 'Danger' : `${tStats.canMiss} Safe Skip${tStats.canMiss !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          {/* Target Progress Bar */}
          <View style={s.progressContainer}>
            <View style={s.progressTextRow}>
              <Text style={[s.progressLabel, isDanger ? { color: sc.main } : {}]}>
                {isDanger ? `Below ${req}% Requirement` : `Target: ${req}%`}
              </Text>
              <Text style={[s.progressResult, { color: sc.main }]}>
                {isDanger
                  ? `Attend Next ${tStats.requiresAttend}`
                  : `+${above.toFixed(0)}% Above Goal`}
              </Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barMark, { left: `${req}%`, backgroundColor: isDanger ? sc.main : 'rgba(255,255,255,0.35)' }]} />
              <View style={[s.barFill, { backgroundColor: sc.main, width: `${Math.min(tStats.percentage, 100)}%` }]} />
            </View>
          </View>

          {/* Danger banner if below requirement */}
          {isDanger && (
            <View style={[s.dangerBanner, { backgroundColor: `${sc.main}14`, borderColor: `${sc.main}30` }]}>
              <Text style={[s.dangerBannerText, { color: sc.main }]}>
                Attend next {tStats.requiresAttend} class{tStats.requiresAttend !== 1 ? 'es' : ''} to reach {req}%
              </Text>
              <View style={[s.urgentPill, { backgroundColor: `${sc.main}25` }]}>
                <Text style={[s.urgentText, { color: sc.main }]}>URGENT</Text>
              </View>
            </View>
          )}

          {/* Forecast Chips */}
          <View style={s.forecastRow}>
            <View style={s.forecastChip}>
              <Text style={[s.forecastNum, { color: '#10b981' }]}>{tStats.canMiss}</Text>
              <Text style={s.forecastLabel}>Safe Skips</Text>
            </View>
            <View style={s.forecastChip}>
              <Text style={[s.forecastNum, { color: isDanger ? '#ef4444' : '#8b5cf6' }]}>
                {tStats.requiresAttend}
              </Text>
              <Text style={s.forecastLabel}>
                {isDanger ? 'Attend to Recover' : 'To Maintain'}
              </Text>
            </View>
          </View>

          {/* Breakdown chips */}
          <StatsBreakdown stats={tStats} />
        </View>

        {/* Course Events (CTs, Assignments, Exams) */}
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

        {/* ── Class History for this Teacher Only ── */}
        <Text style={s.sectionTitle}>
          Class History ({teacherSessions.length})
        </Text>
        {teacherSessions.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>📋</Text>
            <Text style={s.emptyText}>No classes recorded yet for {activeTeacher.name}.</Text>
          </View>
        ) : (
          teacherSessions
            .slice()
            .reverse()
            .map((session) => {
              const record = sessionToRecord.get(session.id);
              return (
                <View key={session.id} style={s.sessionCard}>
                  <View style={s.sessionTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={s.sessionTime}>
                        {formatTime(session.startTime)} – {formatTime(session.endTime)}
                        {session.room ? ` · 🏫 Room ${session.room}` : ''}
                      </Text>
                      {session.topic && (
                        <Text style={s.sessionTopic} numberOfLines={1}>📖 {session.topic}</Text>
                      )}
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
                      <View style={[s.statusBadge, { backgroundColor: '#20263b' }]}>
                        <Text style={[s.statusBadgeText, { color: '#a1a1aa' }]}>
                          Not Marked
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Change status action row */}
                  <View style={s.changeStatusRow}>
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => {
                      const isActive = record?.status === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            s.statusBtn,
                            {
                              backgroundColor: isActive ? STATUS_COLOR[status] : 'transparent',
                              borderColor: STATUS_COLOR[status] ?? '#20263b',
                            },
                          ]}
                          onPress={() => handleStatusChange(session, status)}
                        >
                          <Text
                            style={[
                              s.statusBtnText,
                              {
                                color: isActive ? '#ffffff' : STATUS_COLOR[status],
                              },
                            ]}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121522',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#20263b',
  },
  iconBtnText: { fontSize: 24, color: '#fff', lineHeight: 28 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontWeight: '700' },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  courseName: { fontSize: 26, fontWeight: '800', color: '#ffffff', letterSpacing: -0.3 },
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
  infoPillText: { fontSize: 12, color: '#a1a1aa', fontWeight: '500' },

  // Teacher switcher tab
  teacherTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121522',
    borderWidth: 1,
    borderColor: '#20263b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  teacherTabText: { fontSize: 12, color: '#a1a1aa', fontWeight: '600' },

  // Stats Card
  statsCard: {
    backgroundColor: '#121522',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  teacherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  teacherCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  teacherAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  teacherCardTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  teacherCardSubtitle: { fontSize: 11, color: '#71717a', marginTop: 2 },

  statsTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bigPct: { fontSize: 34, fontWeight: '800' },
  subText: { fontSize: 12, color: '#a1a1aa', marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  progressContainer: {
    backgroundColor: '#0d0f1a',
    borderWidth: 1,
    borderColor: '#181d2f',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 10, color: '#71717a' },
  progressResult: { fontSize: 10, fontWeight: '700' },
  barBg: { height: 7, backgroundColor: '#181d2f', borderRadius: 4, overflow: 'hidden', position: 'relative' },
  barMark: { position: 'absolute', top: 0, bottom: 0, width: 2, zIndex: 10 },
  barFill: { height: '100%', borderRadius: 4 },

  dangerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  dangerBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  urgentPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  urgentText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  forecastRow: {
    flexDirection: 'row',
    gap: 10,
  },
  forecastChip: {
    flex: 1,
    backgroundColor: '#181d2f',
    borderWidth: 1,
    borderColor: '#20263b',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  forecastNum: { fontSize: 20, fontWeight: '800' },
  forecastLabel: { fontSize: 10, color: '#71717a', marginTop: 2, textAlign: 'center', fontWeight: '600' },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
  },
  sessionCard: {
    backgroundColor: '#121522',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#20263b',
  },
  sessionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sessionDate: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  sessionTime: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  sessionTopic: { fontSize: 12, color: '#8b5cf6', marginTop: 4, fontStyle: 'italic' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  changeStatusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#181d2f',
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
  eventCard: {
    backgroundColor: '#121522',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#20263b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventEmoji: { fontSize: 20 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  eventSub: { fontSize: 12, color: '#a1a1aa', marginTop: 1 },
  emptyCard: {
    backgroundColor: '#121522',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#20263b',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 13, color: '#71717a', textAlign: 'center' },
});
