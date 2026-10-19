// ============================================================
// CLASSLY — Home Screen (Dark Theme Match)
// ============================================================
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  Animated,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format, formatDistanceToNow } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppStore } from '@/store/appStore';

import { getClassSessionsByDate, createClassSession, createClassSessionsBatch, deleteClassSession } from '@/database/classes';
import { getCoursesBySemester } from '@/database/courses';
import { getAttendanceByCourse, getAttendanceBySession, upsertAttendance } from '@/database/attendance';
import { getUpcomingEvents, createEvent, getEventsByCourse, toggleEventCompleted, deleteEvent } from '@/database/events';

import { buildAttendanceStats, buildOverallAttendanceStats } from '@/utils/attendance';
import { formatTime, getGreeting, getTodayString, calculateEndTime, generateRecurringClasses } from '@/utils/classes';
import { generateId } from '@/utils/ids';
import { MorphingAddCard } from '@/components/MorphingAddCard';

import type { ClassSession, Course, AttendanceStats, AcademicEvent, AttendanceStatus, AcademicEventType, WeekDay, RecurrenceRule } from '@/types';

// ── Shared dark token set — EXACTLY matches Attendance & Calendar ──────────
const T = {
  bg: '#090a0f',
  card: '#121522',       // same as attendance
  cardDeep: '#0d0f1a',   // same inset bg as attendance progress container
  border: '#20263b',     // same as attendance
  borderInner: '#181d2f',// same as attendance inner border
  text: '#ffffff',
  textSub: '#a1a1aa',
  textDim: '#71717a',
  brand: '#8b5cf6',
  brandLight: 'rgba(139,92,246,0.15)',
  brandBorder: 'rgba(139,92,246,0.3)',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.15)',
  red: '#F43F5E',
  redLight: 'rgba(244,63,94,0.15)',
  amber: '#F59E0B',
  amberLight: 'rgba(245,158,11,0.15)',
};

interface TodayClass {
  session: ClassSession;
  course: Course;
  attendanceStatus: AttendanceStatus | null;
}

const EVENT_ICONS: Record<string, string> = {
  ct: '📝', assignment: '📌', exam: '📖',
  presentation: '🎤', lab: '🔬', event: '🎯', class: '📚', other: '📌',
};
const DAYS: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AnimatedFabOption({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 1.15,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[s.fabOptionPill, { transform: [{ scale }] }]}>
        <Text style={s.fabOptionEmoji}>{emoji}</Text>
        <Text style={s.fabOptionLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}



export default function HomeScreen() {
  const { profile, activeSemester, isDbReady } = useAppStore();
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [overallStats, setOverallStats] = useState<ReturnType<typeof buildOverallAttendanceStats> | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<AcademicEvent[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [expandedAddType, setExpandedAddType] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ClassSession | AcademicEvent | null>(null);
  const fabAnim = React.useRef(new Animated.Value(0)).current;

  function toggleFab() {
    if (showFabMenu) {
      Animated.timing(fabAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowFabMenu(false));
    } else {
      setShowFabMenu(true);
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }).start();
    }
  }

  function handleOptionPress(type: string) {
    Animated.timing(fabAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setShowFabMenu(false);
      setExpandedAddType(type);
    });
  }

  const todayFormatted = format(new Date(), 'EEEE, MMMM d');
  const today = getTodayString();

  const todayEvents = upcomingEvents.filter(e => e.date === today);
  const futureEvents = upcomingEvents.filter(e => e.date !== today);

  async function loadData() {
    if (!activeSemester || !isDbReady) return;
    try {
      const [sessions, courses] = await Promise.all([
        getClassSessionsByDate(today, activeSemester.id),
        getCoursesBySemester(activeSemester.id),
      ]);
      const courseMap = new Map(courses.map((c) => [c.id, c]));
      const classesWithAttendance: TodayClass[] = await Promise.all(
        sessions.map(async (session) => {
          const course = courseMap.get(session.courseId)!;
          const record = await getAttendanceBySession(session.id);
          return { session, course, attendanceStatus: record?.status ?? null };
        })
      );
      classesWithAttendance.sort((a, b) => {
        const timeA = a.session.time || '23:59';
        const timeB = b.session.time || '23:59';
        return timeA.localeCompare(timeB);
      });
      setTodayClasses(classesWithAttendance);
      setAllCourses(courses);
      const allStats: AttendanceStats[] = await Promise.all(
        courses.map(async (course) => {
          const records = await getAttendanceByCourse(course.id);
          return buildAttendanceStats(course, records, activeSemester.attendanceRequirement);
        })
      );
      setOverallStats(buildOverallAttendanceStats(allStats));
      const upcoming = await getUpcomingEvents(activeSemester.id, today);
      setUpcomingEvents(upcoming.slice(0, 5));
    } catch (err) {
      console.error('[Home] Failed to load data:', err);
    }
  }

  useFocusEffect(useCallback(() => { loadData(); }, [activeSemester?.id, isDbReady]));

  async function handleMarkAttendance(session: ClassSession, status: AttendanceStatus) {
    if (!activeSemester) return;
    const existing = await getAttendanceBySession(session.id);
    const now = new Date().toISOString();
    await upsertAttendance({
      id: existing?.id ?? generateId('att'),
      classSessionId: session.id,
      courseId: session.courseId,
      semesterId: activeSemester.id,
      date: session.date,
      status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await loadData();
  }

  async function handleClassCancel(sessionId: string) {
    await deleteClassSession(sessionId);
    setExpandedEventId(null);
    await loadData();
  }

  async function handleEventComplete(eventId: string, isCompleted: boolean) {
    await toggleEventCompleted(eventId, isCompleted, new Date().toISOString());
    setExpandedEventId(null);
    await loadData();
  }

  async function handleEventDelete(eventId: string) {
    await deleteEvent(eventId);
    setExpandedEventId(null);
    await loadData();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const todayAttended = todayClasses.filter(
    (c) => c.attendanceStatus === 'present' || c.attendanceStatus === 'late'
  ).length;

  const pctColor = overallStats
    ? overallStats.percentage >= 75 ? T.green : overallStats.percentage >= 60 ? T.amber : T.red
    : T.brand;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand} />}
      >
        {/* ── Header ─────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{profile?.name ?? 'Student'} 👋</Text>
            <Text style={s.date}>{todayFormatted}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/search')}>
              <Text style={s.iconBtnText}>🔍</Text>
            </TouchableOpacity>
            <Pressable onPress={() => router.push('/more')}>
              <View style={[s.avatarCircle, { backgroundColor: profile?.avatarColor ?? T.brand }]}>
                <Text style={s.avatarText}>{profile?.name?.charAt(0).toUpperCase() ?? 'S'}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── No semester ──────────────────────────────*/}
        {!activeSemester && (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>🎓</Text>
            <Text style={s.emptyText}>Complete onboarding to set up your semester.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/onboarding')}>
              <Text style={s.emptyBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSemester && (
          <>
            {/* ── Quick Stats Row ───────────────────── */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statNum}>{todayClasses.length}</Text>
                <Text style={s.statLabel}>Classes Today</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: T.green }]}>{todayAttended}</Text>
                <Text style={s.statLabel}>Attended</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: pctColor }]}>
                  {overallStats ? `${overallStats.percentage.toFixed(0)}%` : '—'}
                </Text>
                <Text style={s.statLabel}>Overall</Text>
              </View>
            </View>


            {/* ── Today's Classes ───────────────────── */}
            <View style={{ position: 'relative', zIndex: 100, minHeight: 200 }}>
              <View style={s.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={s.sectionTitle}>Today's Schedule</Text>
                <TouchableOpacity onPress={() => router.push('/timetable')}>
                  <Text style={s.seeAll}>Timetable ›</Text>
                </TouchableOpacity>
              </View>
              <View>
                <TouchableOpacity style={s.addBtnInline} onPress={toggleFab}>
                  <Text style={s.addBtnInlineText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Absolute Dropdown Menu */}
            {showFabMenu && (
              <Animated.View style={[s.fabMenuContainer, {
                opacity: fabAnim,
                position: 'absolute', top: 52, right: 0, zIndex: 999,
                transform: [
                  { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                  { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) },
                ],
              }]}>
                <AnimatedFabOption label="Assignment" emoji="📌" onPress={() => handleOptionPress('assignment')} />
                <AnimatedFabOption label="Class Test" emoji="📝" onPress={() => handleOptionPress('ct')} />
                <AnimatedFabOption label="Class" emoji="🏫" onPress={() => handleOptionPress('class')} />
              </Animated.View>
            )}

            {todayClasses.length === 0 && todayEvents.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>🎉</Text>
                <Text style={s.emptyText}>Nothing scheduled for today!</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={toggleFab}>
                  <Text style={s.emptyBtnText}>+ Add Something</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
              {todayClasses.map(({ session, course, attendanceStatus }) => {
                const badgeBg = attendanceStatus === 'present' ? T.greenLight : (attendanceStatus === 'absent' ? T.redLight : T.borderInner);
                const badgeColor = attendanceStatus === 'present' ? T.green : (attendanceStatus === 'absent' ? T.red : T.textSub);
                const badgeLabel = attendanceStatus === 'present' ? 'Present' : (attendanceStatus === 'absent' ? 'Absent' : 'Pending');

                const teacherName = session.teacherId && course.teachers
                  ? course.teachers.find(t => t.id === session.teacherId)?.name
                  : (course.teachers?.length === 1 ? course.teachers[0].name : null);
                
                const topText = [course.code, teacherName].filter(Boolean).join(' • ') || course.name.toUpperCase();

                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[s.sessionCard, { borderColor: `${course.color}60`, flexDirection: 'column', alignItems: 'stretch', marginBottom: 12 }]}
                    onPress={() => setExpandedEventId(expandedEventId === session.id ? null : session.id)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', width: '100%', height: 74 }}>
                      {/* Left Col */}
                      <View style={s.sessionLeft}>
                        <Text style={{ fontSize: 20, marginBottom: 2 }}>🏫</Text>
                        <Text style={s.timeStart}>{formatTime(session.startTime)}</Text>
                        <Text style={s.timeEnd}>{formatTime(session.endTime)}</Text>
                      </View>

                      {/* Divider */}
                      <View style={[s.sessionDivider, { backgroundColor: course.color }]} />

                      {/* Right Col */}
                      <View style={s.sessionRight}>
                        <View style={s.sessionRightHeader}>
                          <Text style={[s.courseCode, { color: course.color }]} numberOfLines={1}>
                            {topText}
                          </Text>
                          <View style={[s.badge, { backgroundColor: badgeBg }]}>
                            <Text style={[s.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                          </View>
                        </View>
                        <Text style={s.courseTitle} numberOfLines={1}>{course.name}</Text>
                        <View style={s.locRow}>
                          {(session.room || course.room) ? (
                            <Text style={s.locText}>📍 {session.room ?? course.room}</Text>
                          ) : <View style={{ flex: 1 }} />}
                        </View>
                      </View>
                    </View>

                    {expandedEventId === session.id && (
                      <View style={[s.attBtns, { marginTop: 16, width: '100%' }]}>
                        <TouchableOpacity
                          style={[s.attBtn, { borderColor: T.green }]}
                          onPress={() => { handleMarkAttendance(session, 'present'); setExpandedEventId(null); }}
                        >
                          <Text style={[s.attBtnText, { color: T.green }]}>✓ Present</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.attBtn, { borderColor: T.red }]}
                          onPress={() => { handleMarkAttendance(session, 'absent'); setExpandedEventId(null); }}
                        >
                          <Text style={[s.attBtnText, { color: T.red }]}>✗ Absent</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.attBtn, { borderColor: T.textSub }]}
                          onPress={() => handleClassCancel(session.id)}
                        >
                          <Text style={[s.attBtnText, { color: T.textSub }]}>✕ Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.attBtn, { borderColor: T.brand }]}
                          onPress={() => { setExpandedAddType('class'); setEditItem(session); }}
                        >
                          <Text style={[s.attBtnText, { color: T.brand }]}>✎ Edit</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              
              {todayEvents.map((event, i) => {
                  const course = event.courseId ? allCourses.find((c) => c.id === event.courseId) : null;
                    const cName = course?.name;
                    
                    const match = event.title.match(/^(.+?)\s\(([^)]+)\)$/);
                    let displayTitle = match ? match[1] : event.title;
                    let displayTeacher: string | null = match
                      ? match[2]
                      : (course?.teachers?.length === 1 ? course.teachers[0].name : null);

                    const emojiIcon = EVENT_ICONS[event.type] ?? '📌';
                    let timerText = '';
                    try {
                      const eventDateTime = new Date(`${event.date}T${event.time || '23:59:00'}`);
                      timerText = formatDistanceToNow(eventDateTime, { addSuffix: true });
                    } catch (e) {}

                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[s.sessionCard, { borderColor: `${course?.color ?? T.brand}60`, flexDirection: 'column', alignItems: 'stretch', marginBottom: 12 }]}
                        onPress={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flexDirection: 'row', width: '100%', height: 74 }}>
                          <View style={s.sessionLeft}>
                            <Text style={{ fontSize: 24, marginTop: 4 }}>{emojiIcon}</Text>
                            {event.time && <Text style={s.timeEnd}>{formatTime(event.time)}</Text>}
                          </View>
                          <View style={[s.sessionDivider, { backgroundColor: course?.color ?? T.brand }]} />
                          <View style={s.sessionRight}>
                            <View style={s.sessionRightHeader}>
                              {displayTeacher ? (
                                <Text style={[s.courseCode, { color: course?.color ?? T.text, flex: 1, fontSize: 13 }]} numberOfLines={1}>
                                  {displayTeacher}
                                </Text>
                              ) : (
                                <Text style={[s.courseCode, { color: course?.color ?? T.text, flex: 1, fontSize: 13 }]} numberOfLines={1}>
                                  {cName || displayTitle}
                                </Text>
                              )}
                              <View style={[s.badge, { backgroundColor: event.isCompleted ? T.greenLight : 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: event.isCompleted ? T.green : T.brand, marginLeft: 8 }]}>
                                <Text style={[s.badgeText, { color: event.isCompleted ? T.green : T.brand }]}>
                                  {event.isCompleted ? 'Done' : displayTitle}
                                </Text>
                              </View>
                            </View>
                            {displayTeacher && course && <Text style={s.courseTitle} numberOfLines={1}>📚 {course.name}</Text>}
                            <View style={[s.locRow, { marginTop: 4 }]}>
                              {timerText ? (
                                <View style={[s.timerBadge]}>
                                  <Text style={s.timerText}>⏳ {timerText}</Text>
                                </View>
                              ) : <View style={{ flex: 1 }} />}
                            </View>
                          </View>
                        </View>

                        {expandedEventId === event.id && (
                          <View style={[s.attBtns, { marginTop: 16, width: '100%' }]}>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: event.isCompleted ? T.textSub : T.green }]}
                              onPress={() => handleEventComplete(event.id, !event.isCompleted)}
                            >
                              <Text style={[s.attBtnText, { color: event.isCompleted ? T.textSub : T.green }]}>
                                {event.isCompleted ? '↩ Undo' : '✓ Done'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: T.red }]}
                              onPress={() => handleEventComplete(event.id)}
                            >
                              <Text style={[s.attBtnText, { color: T.red }]}>✗ Missed</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: T.textSub }]}
                              onPress={() => handleEventDelete(event.id)}
                            >
                              <Text style={[s.attBtnText, { color: T.textSub }]}>✕ Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: T.brand }]}
                              onPress={() => { setExpandedAddType(event.type); setEditItem(event); }}
                            >
                              <Text style={[s.attBtnText, { color: T.brand }]}>✎ Edit</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </>
            )}
            </View>

            {/* ── Upcoming Events ───────────────────── */}
            {futureEvents.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Upcoming</Text>
                {futureEvents.map((event, i) => {
                  const course = event.courseId ? allCourses.find((c) => c.id === event.courseId) : null;
                    const cName = course?.name;
                    
                    // If the title has an embedded "(Teacher Name)" suffix, extract it.
                    // This is added at CT creation time. That is the ONLY teacher to show.
                    const match = event.title.match(/^(.+?)\s\(([^)]+)\)$/);
                    let displayTitle = match ? match[1] : event.title;
                    let displayTeacher: string | null = match
                      ? match[2]
                      : (course?.teachers?.length === 1 ? course.teachers[0].name : null);

                    // Distinguish Assignment icon — user chose 📌
                    const emojiIcon = EVENT_ICONS[event.type] ?? '📌';

                    let timerText = '';
                    try {
                      const eventDateTime = new Date(`${event.date}T${event.time || '23:59:00'}`);
                      timerText = formatDistanceToNow(eventDateTime, { addSuffix: true });
                    } catch (e) {}

                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[s.sessionCard, { borderColor: `${course?.color ?? T.brand}60`, flexDirection: 'column', alignItems: 'stretch' }, i < futureEvents.length - 1 && { marginBottom: 12 }]}
                        onPress={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flexDirection: 'row', width: '100%', height: 74 }}>
                          <View style={s.sessionLeft}>
                            <Text style={{ fontSize: 24, marginTop: 4 }}>{emojiIcon}</Text>
                            {event.time && <Text style={s.timeEnd}>{formatTime(event.time)}</Text>}
                          </View>
                          <View style={[s.sessionDivider, { backgroundColor: course?.color ?? T.brand }]} />
                          <View style={s.sessionRight}>
                            <View style={s.sessionRightHeader}>
                              {displayTeacher ? (
                                <Text style={[s.courseCode, { color: course?.color ?? T.text, flex: 1, fontSize: 13 }]} numberOfLines={1}>
                                  {displayTeacher}
                                </Text>
                              ) : (
                                <Text style={[s.courseCode, { color: course?.color ?? T.text, flex: 1, fontSize: 13 }]} numberOfLines={1}>
                                  {cName || displayTitle}
                                </Text>
                              )}
                              <View style={[s.badge, { backgroundColor: event.isCompleted ? T.greenLight : 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: event.isCompleted ? T.green : T.brand, marginLeft: 8 }]}>
                                <Text style={[s.badgeText, { color: event.isCompleted ? T.green : T.brand }]}>
                                  {event.isCompleted ? 'Done' : displayTitle}
                                </Text>
                              </View>
                            </View>
                            {displayTeacher && course && <Text style={s.courseTitle} numberOfLines={1}>📚 {course.name}</Text>}
                            <View style={[s.locRow, { marginTop: 4 }]}>
                              <Text style={s.locText}>📅 {format(new Date(event.date), 'EEE, MMM d')}</Text>
                              {timerText ? (
                                <View style={[s.timerBadge, { marginLeft: 'auto' }]}>
                                  <Text style={s.timerText}>⏳ {timerText}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        {expandedEventId === event.id && (
                          <View style={[s.attBtns, { marginTop: 16, width: '100%' }]}>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: event.isCompleted ? T.textSub : T.green }]}
                              onPress={() => handleEventComplete(event.id, !event.isCompleted)}
                            >
                              <Text style={[s.attBtnText, { color: event.isCompleted ? T.textSub : T.green }]}>
                                {event.isCompleted ? '↩ Undo' : '✓ Done'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: T.red }]}
                              onPress={() => handleEventComplete(event.id)}
                            >
                              <Text style={[s.attBtnText, { color: T.red }]}>✗ Missed</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: T.textSub }]}
                              onPress={() => handleEventDelete(event.id)}
                            >
                              <Text style={[s.attBtnText, { color: T.textSub }]}>✕ Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.attBtn, { borderColor: T.brand }]}
                              onPress={() => { setExpandedAddType(event.type); setEditItem(event); }}
                            >
                              <Text style={[s.attBtnText, { color: T.brand }]}>✎ Edit</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </>
            )}
          </>
        )}
      </ScrollView>




      <MorphingAddCard
        visible={!!expandedAddType}
        type={expandedAddType || 'class'}
        activeSemester={activeSemester}
        editItem={editItem}
        onClose={() => { setExpandedAddType(null); setEditItem(null); }}
        onSaved={() => { setExpandedAddType(null); setEditItem(null); loadData(); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1, paddingHorizontal: 20, paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: { fontSize: 13, color: T.textSub },
  name: { fontSize: 22, fontWeight: '800', color: T.text, marginTop: 2, letterSpacing: -0.3 },
  date: { fontSize: 12, color: T.textDim, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.border,
  },
  iconBtnText: { fontSize: 18 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Section
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: T.textDim,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600', color: T.brand },

  // Quick Stats — match attendance chip style
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: T.card, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: T.border,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: T.text },
  statLabel: { fontSize: 9, fontWeight: '600', color: T.textDim, marginTop: 4, textTransform: 'uppercase' },

  // Overall card — matches attendance card structure exactly
  card: {
    backgroundColor: T.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: T.border,
  },
  overallTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  overallPct: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  overallSub: { fontSize: 12, color: T.textSub, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  // Inset progress container — matches attendance exactly
  barContainer: {
    backgroundColor: T.cardDeep, borderWidth: 1, borderColor: T.borderInner,
    borderRadius: 12, padding: 8, gap: 6,
  },
  barBg: { height: 8, backgroundColor: T.borderInner, borderRadius: 4, position: 'relative', overflow: 'hidden' },
  barMark: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', zIndex: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 10, color: T.textDim },
  dangerBanner: {
    marginTop: 10, backgroundColor: T.redLight,
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
  },
  dangerBannerText: { fontSize: 12, color: T.red, fontWeight: '600' },

  // Class Cards — matches attendance card structure exactly
  classCard: {
    backgroundColor: T.card,  // same #121522 as attendance
    borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', padding: 16, gap: 16, marginBottom: 12,
  },
  classLeft: { width: 65, alignItems: 'center', paddingTop: 2 },
  classTimeStart: { color: T.text, fontSize: 14, fontWeight: '700' },
  classTimeEnd: { color: T.textDim, fontSize: 12, marginTop: 4 },
  classDivider: { width: 3, borderRadius: 2 },
  classRight: { flex: 1 },
  classRightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  attBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  attBadgeText: { fontSize: 10, fontWeight: '700' },
  className: { fontSize: 16, fontWeight: '700', color: T.text, marginTop: 6, marginBottom: 8 },
  classRoom: { fontSize: 13, color: T.textSub, marginBottom: 10 },
  attBtns: { flexDirection: 'row', gap: 8 },
  attBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1.5 },
  attBtnText: { fontSize: 12, fontWeight: '700' },

  sessionCard: {
    flexDirection: 'row', backgroundColor: '#1E1E28', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1,
  },
  sessionLeft: { width: 62, alignItems: 'center', justifyContent: 'center' },
  sessionDivider: { width: 3, borderRadius: 2, marginHorizontal: 10 },
  sessionRight: { flex: 1, justifyContent: 'center', minHeight: 60 },
  timeStart: { fontSize: 12, fontWeight: '800', color: T.text, marginBottom: 0 },
  timeEnd: { fontSize: 12, fontWeight: '800', color: T.textDim },
  sessionRightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  courseCode: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flex: 1, marginRight: 8 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center' },
  locText: { fontSize: 12, color: T.textSub },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  eventRowCard: {
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.border,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  eventTitle: { fontSize: 14, fontWeight: '600', color: T.text },
  eventSub: { fontSize: 12, color: T.textSub, marginTop: 4 },

  // Empty state — same card bg as attendance
  emptyCard: {
    backgroundColor: T.card, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: T.border,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 14, backgroundColor: '#7c3aed',
    paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Menu Container absolute overlay
  fabMenuContainer: {
    alignItems: 'flex-end', gap: 8,
  },
  fabOptionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.card, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 16, borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    width: 150,
  },
  fabOptionLabel: { color: T.text, fontWeight: '600', fontSize: 14 },
  fabOptionEmoji: { fontSize: 18 },
  addBtnInline: {
    backgroundColor: T.brand, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    shadowColor: T.brand, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  addBtnInlineText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  timerBadge: {
    backgroundColor: T.borderInner,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    color: T.brand, fontSize: 10, fontWeight: '700',
  },
});

const ms = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  hint: { fontSize: 13, color: T.textSub },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.borderInner },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, fontWeight: '600', color: T.text },
  input: { backgroundColor: T.borderInner, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: T.text, marginBottom: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 },
  daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, backgroundColor: T.borderInner },
  dayBtnText: { fontSize: 13, fontWeight: '700', color: T.textSub },
  saveBtn: { marginTop: 24, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});
