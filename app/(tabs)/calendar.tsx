// ============================================================
// CLASSLY — Calendar Screen (Connected to real DB)
// ============================================================
import React, { useCallback, useState, startTransition } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { router, useFocusEffect } from 'expo-router';

import { useAppStore } from '@/store/appStore';
import { getClassSessionsByDateRange, getClassSessionsByDate, deleteClassSession } from '@/database/classes';
import { getEventsByDateRange, toggleEventCompleted, deleteEvent } from '@/database/events';
import { getCoursesBySemester } from '@/database/courses';
import { getAttendanceByCourse, getAttendanceBySession, upsertAttendance } from '@/database/attendance';
import { buildAttendanceStats } from '@/utils/attendance';
import { formatTime } from '@/utils/classes';
import { generateId } from '@/utils/ids';
import { MorphingAddCard } from '@/components/MorphingAddCard';
import type { ClassSession, AcademicEvent, Course, AttendanceStatus } from '@/types';

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
  brandBorder: 'rgba(139,92,246,0.3)',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.15)',
  red: '#F43F5E',
  redLight: 'rgba(244,63,94,0.15)',
  amber: '#F59E0B',
  amberLight: 'rgba(245,158,11,0.15)',
};

interface DaySession {
  session: ClassSession;
  course: Course;
  attendanceStatus: string | null;
  percentage: number;
}

interface DayEvent {
  event: AcademicEvent;
  course: Course | undefined;
}
  
function AnimatedFabOption({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
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

export default function CalendarScreen() {
  const { activeSemester } = useAppStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedAddType, setExpandedAddType] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ClassSession | AcademicEvent | null>(null);

  const [showFabMenu, setShowFabMenu] = useState(false);
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
      setEditItem(null);
    });
  }

  // Real data
  const [courseMap, setCourseMap] = useState<Map<string, Course>>(new Map());
  const [sessionDots, setSessionDots] = useState<Map<string, string[]>>(new Map()); // date -> colors
  const [daySessions, setDaySessions] = useState<DaySession[]>([]);
  const [dayEvents, setDayEvents] = useState<DayEvent[]>([]);

  // Load course map + dots for the whole month
  useFocusEffect(
    useCallback(() => {
      async function loadMonth() {
        if (!activeSemester) return;
        try {
          const courses = await getCoursesBySemester(activeSemester.id);
          const map = new Map(courses.map((c) => [c.id, c]));
          setCourseMap(map);

          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          const mStartStr = format(monthStart, 'yyyy-MM-dd');
          const mEndStr = format(monthEnd, 'yyyy-MM-dd');

          const [sessions, events] = await Promise.all([
            getClassSessionsByDateRange(mStartStr, mEndStr, activeSemester.id),
            getEventsByDateRange(mStartStr, mEndStr, activeSemester.id),
          ]);

          // Build date → course colors
          const dots = new Map<string, string[]>();
          sessions.forEach((s) => {
            const color = map.get(s.courseId)?.color ?? T.brand;
            const existing = dots.get(s.date) ?? [];
            if (!existing.includes(color)) existing.push(color);
            dots.set(s.date, existing);
          });
          events.forEach((e) => {
            const color = e.courseId ? (map.get(e.courseId)?.color ?? '#F59E0B') : '#F59E0B';
            const existing = dots.get(e.date) ?? [];
            if (!existing.includes(color)) existing.push(color);
            dots.set(e.date, existing);
          });
          setSessionDots(dots);
        } catch (err) {
          console.error('[Calendar] Month load failed:', err);
        }
      }
      loadMonth();
    }, [activeSemester?.id, currentMonth])
  );

  // Load sessions + events for selected day
  useFocusEffect(
    useCallback(() => {
      async function loadDay() {
        if (!activeSemester) return;
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');

          const courses = await getCoursesBySemester(activeSemester.id);
          const map = new Map(courses.map((c) => [c.id, c]));

          const [sessions, events] = await Promise.all([
            getClassSessionsByDate(dateStr, activeSemester.id),
            getEventsByDateRange(dateStr, dateStr, activeSemester.id),
          ]);

          // Attach attendance status + percentage to each session
          const withAtt: DaySession[] = await Promise.all(
            sessions.map(async (session) => {
              const course = map.get(session.courseId)!;
              const record = await getAttendanceBySession(session.id);
              const allRecords = await getAttendanceByCourse(session.courseId);
              const stats = buildAttendanceStats(course, allRecords, activeSemester.attendanceRequirement);
              return {
                session,
                course,
                attendanceStatus: record?.status ?? null,
                percentage: stats.percentage,
              };
            })
          );
          withAtt.sort((a, b) => {
            const timeA = a.session.time || '23:59';
            const timeB = b.session.time || '23:59';
            return timeA.localeCompare(timeB);
          });
          setDaySessions(withAtt);

          const withCourse: DayEvent[] = events.map((e) => ({
            event: e,
            course: e.courseId ? map.get(e.courseId) : undefined,
          }));
          withCourse.sort((a, b) => {
            const timeA = a.event.time || '23:59';
            const timeB = b.event.time || '23:59';
            return timeA.localeCompare(timeB);
          });
          setDayEvents(withCourse);
        } catch (err) {
          console.error('[Calendar] Day load failed:', err);
        }
      }
      loadDay();
    }, [activeSemester?.id, selectedDate])
  );

  const loadData = useCallback(() => {
    // We can just trigger a reload of the day by resetting selectedDate to itself,
    // but React won't trigger if it's the same object reference, so let's do:
    setSelectedDate(new Date(selectedDate.getTime()));
  }, [selectedDate]);

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
    loadData();
  }

  async function handleClassCancel(sessionId: string) {
    await deleteClassSession(sessionId);
    setExpandedEventId(null);
    loadData();
  }

  async function handleEventComplete(eventId: string, isCompleted: boolean) {
    await toggleEventCompleted(eventId, isCompleted, new Date().toISOString());
    setExpandedEventId(null);
    loadData();
  }

  async function handleEventDelete(eventId: string) {
    await deleteEvent(eventId);
    setExpandedEventId(null);
    loadData();
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
    weeks.push(week);
  }

  const attStatusBadge = (status: string | null) => {
    if (status === 'present') return { label: 'Present', bg: 'rgba(16,185,129,0.2)', col: '#10B981' };
    if (status === 'absent')  return { label: 'Absent',  bg: 'rgba(244,63,94,0.2)',  col: '#F43F5E' };
    if (status === 'late')    return { label: 'Late',    bg: 'rgba(245,158,11,0.2)', col: '#F59E0B' };
    return { label: 'Upcoming', bg: 'rgba(255,255,255,0.08)', col: '#A1A1AA' };
  };

  const EVENT_ICONS: Record<string, string> = {
    ct: '📝', assignment: '📌', exam: '📖',
    presentation: '🎤', lab: '🔬', event: '🎯', other: '📌',
  };

  const totalItems = daySessions.length + dayEvents.length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* HEADER */}
      <View style={s.header}>
        <Text style={s.title}>Calendar</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          <TouchableOpacity 
            style={s.todayBtn} 
            onPress={() => {
              startTransition(() => {
                const now = new Date();
                setCurrentMonth(now);
                setSelectedDate(now);
              });
            }}
          >
            <Text style={s.todayBtnText}>Today</Text>
          </TouchableOpacity>
          <View style={s.monthPill}>
            <TouchableOpacity onPress={() => startTransition(() => setCurrentMonth((m) => subMonths(m, 1)))}>
              <Text style={s.monthNavIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={s.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => startTransition(() => setCurrentMonth((m) => addMonths(m, 1)))}>
              <Text style={s.monthNavIcon}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* CALENDAR WIDGET */}
        <View style={s.calendarCard}>
          <View style={s.weekDayRow}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
              <Text key={d} style={s.weekDayLabel}>{d}</Text>
            ))}
          </View>
          <View style={s.calGrid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={s.weekRow}>
                {week.map((d, di) => {
                  const isCurrent = isSameMonth(d, currentMonth);
                  const isSelected = isSameDay(d, selectedDate);
                  const isToday = isSameDay(d, new Date());
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const dots = sessionDots.get(dateStr) ?? [];

                  return (
                    <TouchableOpacity
                      key={di}
                      style={[s.dayCell, isSelected && s.dayCellSelected, isToday && !isSelected && s.dayCellToday]}
                      onPress={() => setSelectedDate(d)}
                    >
                      <Text style={[
                        s.dayText,
                        !isCurrent && s.dayTextDim,
                        isSelected && s.dayTextSelected,
                        isToday && !isSelected && { color: T.brand, fontWeight: '700' },
                      ]}>
                        {format(d, 'd')}
                      </Text>
                      {dots.length > 0 && (
                        <View style={s.dotsRow}>
                          {dots.slice(0, 3).map((color, i) => (
                            <View key={i} style={[s.dot, { backgroundColor: isSelected ? '#fff' : color }]} />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* DAY INFO HEADER */}
        <View style={{ position: 'relative', zIndex: 100, minHeight: 200 }}>
        <View style={s.dayInfoRow}>
          <View>
            <Text style={s.dayInfoTitle}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
            <Text style={s.dayInfoSub}>
              {totalItems === 0
                ? 'Nothing scheduled'
                : `${daySessions.length} session${daySessions.length !== 1 ? 's' : ''}${dayEvents.length > 0 ? ` · ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}` : ''}`}
            </Text>
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

        {/* SESSIONS */}
        <View style={s.sessionsList}>
          {daySessions.length === 0 && dayEvents.length === 0 && (
            <View style={s.emptyDay}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
              <Text style={s.emptyDayText}>No classes or events on this day.</Text>
            </View>
          )}

          {daySessions.map(({ session, course, attendanceStatus, percentage }) => {
            const badge = attStatusBadge(attendanceStatus);
            
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
                      <Text style={[s.courseCode, { color: course.color, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                        {topText}
                      </Text>
                      <View style={[s.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.badgeText, { color: badge.col }]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={s.courseTitle} numberOfLines={1}>{course.name}</Text>
                    <View style={[s.locRow, { marginTop: 2 }]}>
                      {(session.room || course.room) ? (
                        <Text style={s.locText}>📍 {session.room ?? course.room}</Text>
                      ) : <View style={{ flex: 1 }} />}
                      <Text style={{ fontSize: 11, color: T.textSub, marginLeft: 'auto', fontWeight: '600' }}>
                        Att: <Text style={{ fontWeight: '800', color: course.color }}>{percentage.toFixed(0)}%</Text>
                      </Text>
                    </View>
                    {session.topic && (
                      <Text style={s.topicText} numberOfLines={1}>📝 {session.topic}</Text>
                    )}
                  </View>
                </View>

                {expandedEventId === session.id && (
                  <View style={[s.attBtns, { marginTop: 16, width: '100%' }]}>
                    <TouchableOpacity
                      style={[s.attBtn, { borderColor: T.green }]}
                      onPress={() => handleMarkAttendance(session, 'present')}
                    >
                      <Text style={[s.attBtnText, { color: T.green }]}>✓ Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.attBtn, { borderColor: T.red }]}
                      onPress={() => handleMarkAttendance(session, 'absent')}
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

          {/* EVENTS */}
          {dayEvents.map(({ event, course }) => {
            // Extract embedded "(Teacher Name)" suffix added at CT/Assignment creation.
            const titleMatch = /^(.+?)\s\(([^)]+)\)$/.exec(event.title);
            const displayTitle = titleMatch ? titleMatch[1] : event.title;
            const displayTeacher: string | null = titleMatch
              ? titleMatch[2]
              : (course?.teachers?.length === 1 ? course.teachers[0].name : null);
            const emojiIcon = EVENT_ICONS[event.type] ?? '📌';
            
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
                        <Text style={[s.courseCode, { color: course?.color ?? T.text, flex: 1, fontSize: 14 }]} numberOfLines={1}>
                          {displayTeacher}
                        </Text>
                      ) : (
                        <Text style={[s.courseCode, { color: course?.color ?? T.text, flex: 1, fontSize: 14 }]} numberOfLines={1}>
                          {course?.name || displayTitle}
                        </Text>
                      )}
                      <View style={[s.badge, { backgroundColor: event.isCompleted ? T.greenLight : 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: event.isCompleted ? T.green : T.brand, marginLeft: 8 }]}>
                        <Text style={[s.badgeText, { color: event.isCompleted ? T.green : T.brand }]}>
                          {event.isCompleted ? 'Done' : displayTitle}
                        </Text>
                      </View>
                    </View>
                    {displayTeacher && course && <Text style={s.courseTitle} numberOfLines={1}>📚 {course.name}</Text>}
                    {event.location && <Text style={s.locText}>📍 {event.location}</Text>}
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
        </View>
        </View>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    flexWrap: 'wrap', rowGap: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: T.text, letterSpacing: -0.5, flexShrink: 0 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.card, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    gap: 12, borderWidth: 1, borderColor: T.border,
  },
  monthNavIcon: { color: T.textSub, fontSize: 18, lineHeight: 20 },
  monthLabel: { color: T.text, fontSize: 13, fontWeight: '600' },

  scroll: { flex: 1 },

  calendarCard: {
    backgroundColor: T.card, marginHorizontal: 16, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 14, marginBottom: 20,
    borderWidth: 1, borderColor: T.border,
  },
  weekDayRow: { flexDirection: 'row', marginBottom: 14 },
  weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: T.textDim },
  calGrid: { gap: 10 },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  dayCellSelected: {
    backgroundColor: T.brand,
    shadowColor: T.brand, shadowOpacity: 0.7, shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  dayCellToday: { borderWidth: 1, borderColor: T.brand },
  dayText: { fontSize: 12, color: '#d4d4d8', fontWeight: '500' },
  dayTextDim: { color: T.textDim },
  dayTextSelected: { color: T.text, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 3, position: 'absolute', bottom: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  dayInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 14,
  },
  dayInfoTitle: { fontSize: 17, fontWeight: '700', color: T.text },
  dayInfoSub: { fontSize: 12, color: T.textSub, marginTop: 3 },
  addBtn: {
    backgroundColor: T.brandGlow, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
  },
  addBtnText: { color: T.brand, fontWeight: '600', fontSize: 13 },

  sessionsList: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyDay: { alignItems: 'center', padding: 32 },
  emptyDayText: { color: T.textSub, fontSize: 14, textAlign: 'center' },

  sessionCard: {
    flexDirection: 'row', backgroundColor: '#1E1E28', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1,
  },
  sessionLeft: { width: 62, alignItems: 'center', justifyContent: 'center' },
  sessionDivider: { width: 3, borderRadius: 2, marginHorizontal: 10 },
  sessionRight: { flex: 1, justifyContent: 'center', minHeight: 60 },
  timeStart: { fontSize: 12, fontWeight: '800', color: T.text, marginBottom: 0 },
  timeEnd: { fontSize: 12, color: T.textDim, fontWeight: '800' },
  pctText: { fontSize: 12, fontWeight: '800', marginTop: 8 },
  sessionRightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  courseCode: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flex: 1, marginRight: 8 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: 12, color: T.textSub },
  topicText: { fontSize: 12, color: T.textSub, marginTop: 2 },
  attBtns: { flexDirection: 'row', gap: 8 },
  attBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1.5 },
  attBtnText: { fontSize: 12, fontWeight: '700' },
  todayBtn: { backgroundColor: T.brandLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
  todayBtnText: { color: T.brand, fontWeight: '600', fontSize: 13 },

  addBtnInline: {
    backgroundColor: T.brand, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    shadowColor: T.brand, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  addBtnInlineText: { color: '#fff', fontWeight: '800', fontSize: 13 },

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
});
