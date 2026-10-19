// ============================================================
// CLASSLY — Add Modal
// Quick-add chooser: Class, CT, Assignment, Exam, Event.
// After picking a type, shows the appropriate mini form.
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';

import { getCoursesBySemester } from '@/database/courses';
import { createClassSession, createClassSessionsBatch } from '@/database/classes';
import { createEvent, getEventsByCourse } from '@/database/events';

import { calculateEndTime, getTodayString, formatTime, generateRecurringClasses } from '@/utils/classes';
import { generateId } from '@/utils/ids';
import { scheduleClassReminder, scheduleEventReminder } from '@/utils/notifications';

import type { Course, AcademicEventType, ClassSession, AcademicEvent, WeekDay, RecurrenceRule } from '@/types';

type AddType = 'class' | 'ct' | 'assignment' | 'exam' | 'event';

const ADD_TYPES: { type: AddType; emoji: string; label: string; color: string }[] = [
  { type: 'class', emoji: '📚', label: 'Class', color: '#6366f1' },
  { type: 'ct', emoji: '📝', label: 'Class Test', color: '#ec4899' },
  { type: 'assignment', emoji: '📄', label: 'Assignment', color: '#f59e0b' },
  { type: 'exam', emoji: '📖', label: 'Exam', color: '#ef4444' },
  { type: 'event', emoji: '🗓️', label: 'Event', color: '#10b981' },
];

export default function AddModal() {
  const theme = useTheme();
  const { activeSemester } = useAppStore();
  const { type: initialType } = useLocalSearchParams<{ type: AddType }>();
  const [selectedType, setSelectedType] = useState<AddType | null>(initialType || null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Shared fields
  const [date, setDate] = useState(getTodayString());
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [time, setTime] = useState('10:00');
  const [timeObj, setTimeObj] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [location, setLocation] = useState('');

  // Recurring class fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);
  const [endDate, setEndDate] = useState(activeSemester?.endDate ?? getTodayString());

  const [courseEvents, setCourseEvents] = useState<AcademicEvent[]>([]);

  useEffect(() => {
    if (activeSemester) {
      getCoursesBySemester(activeSemester.id).then(setCourses);
      setEndDate(activeSemester.endDate);
    }
  }, [activeSemester?.id]);

  useEffect(() => {
    if (selectedCourse) {
      getEventsByCourse(selectedCourse.id).then(setCourseEvents);
    } else {
      setCourseEvents([]);
    }
  }, [selectedCourse]);

  // Auto-fill title for CT/Assignment/Exam
  useEffect(() => {
    if (selectedType === 'ct' && selectedCourse) {
      const ctCount = courseEvents.filter(e => e.type === 'ct').length;
      setTitle(`CT ${ctCount + 1}`);
    } else if (selectedType === 'assignment' && selectedCourse) {
      const assignCount = courseEvents.filter(e => e.type === 'assignment').length;
      setTitle(`Assignment ${assignCount + 1}`);
    } else if (selectedType === 'exam' && selectedCourse) {
      setTitle(`${selectedCourse.name} Exam`);
    }
  }, [selectedType, selectedCourse, courseEvents]);

  async function handleSave() {
    if (!activeSemester) return;

    try {
      const now = new Date().toISOString();

      if (selectedType === 'class') {
        if (!selectedCourse) {
          Alert.alert('Select a course', 'Please select a course for this class.');
          return;
        }
        const endTime = calculateEndTime(time, selectedCourse.defaultDurationMinutes);
        
        if (isRecurring) {
          if (selectedDays.length === 0) {
            Alert.alert('Select days', 'Please select at least one day for the recurring class.');
            return;
          }
          if (!endDate) {
            Alert.alert('End date missing', 'Please enter an end date.');
            return;
          }
          const rule: RecurrenceRule = {
            days: selectedDays,
            startDate: date,
            endDate,
            startTime: time,
            endTime,
          };
          const recurrenceGroupId = generateId('grp');
          const sessions = generateRecurringClasses(selectedCourse, rule, recurrenceGroupId);
          // Set teacherId on all recurring sessions
          if (selectedTeacherId) {
            for (const s of sessions) s.teacherId = selectedTeacherId;
          }
          
          if (sessions.length === 0) {
            Alert.alert('No sessions', 'No classes fall on the selected days within the date range.');
            return;
          }
          
          await createClassSessionsBatch(sessions);
          Alert.alert('Classes added! ✅', `Generated ${sessions.length} sessions for ${selectedCourse.name}`);
        } else {
          const session: ClassSession = {
            id: generateId('cls'),
            courseId: selectedCourse.id,
            semesterId: activeSemester.id,
            date,
            startTime: time,
            endTime,
            room: selectedCourse.room,
            teacherId: selectedTeacherId ?? undefined,
            isCancelled: false,
            createdAt: now,
          };
          await createClassSession(session);
          
          // Schedule reminder (e.g. 30 mins before)
          await scheduleClassReminder(session.id, selectedCourse.name, session.room, time, date, 30);
          
          setSuccessMessage(`Class Added: ${selectedCourse.name} on ${date}`);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            router.back();
          }, 2000);
          return; // Skip standard router.back() at bottom
        }
      } else {
        // Event types
        if (!title.trim()) {
          Alert.alert('Enter a title', 'Please enter a title for this event.');
          return;
        }

        let finalTitle = title.trim();
        if (selectedType === 'ct' && selectedTeacherId && selectedCourse?.teachers) {
           const teacherName = selectedCourse.teachers.find(t => t.id === selectedTeacherId)?.name;
           if (teacherName) {
              finalTitle = `${finalTitle} (${teacherName})`;
           }
        }

        const event: AcademicEvent = {
          id: generateId('evt'),
          semesterId: activeSemester.id,
          courseId: selectedCourse?.id,
          type: selectedType as AcademicEventType,
          title: finalTitle,
          date,
          time: selectedType !== 'assignment' ? time : undefined,
          topic: topic.trim() || undefined,
          location: location.trim() || undefined,
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
        };
        await createEvent(event);
        
        // Schedule event reminder (e.g. 24 hours before)
        await scheduleEventReminder(event.id, event.title, event.type, date, event.time, 24);
        
        setSuccessMessage(`${event.type === 'ct' ? 'Class Test' : event.type === 'assignment' ? 'Assignment' : 'Event'} Added: ${title.trim()}`);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.back();
        }, 2000);
        return; // Skip standard router.back() at bottom
      }

      router.back();
    } catch (err) {
      console.error('[AddModal] Save failed:', err);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    innerSheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      flexShrink: 1,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 12,
    },
    title: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
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
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    typeBtn: {
      width: '30%',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      gap: 4,
    },
    typeEmoji: { fontSize: 26 },
    typeLabel: { fontSize: 12, fontWeight: '600' },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    courseRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    courseChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    courseChipActive: { borderWidth: 2 },
    courseDot: { width: 8, height: 8, borderRadius: 4 },
    courseChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text,
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
    row2: { flexDirection: 'row', gap: 10 },
    saveBtn: {
      backgroundColor: theme.brand.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
      ...theme.shadows.neon,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    noCourses: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginBottom: 12,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      backgroundColor: theme.colors.card,
      padding: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    switchLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    dayBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
    },
    dayBtnActive: {
      borderColor: theme.brand.primary,
      backgroundColor: theme.brand.primary + '15',
    },
    dayBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    dayBtnTextActive: {
      color: theme.brand.primary,
    },
  });

  const DAYS: WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function toggleDay(day: WeekDay) {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      setDate(format(selectedDate, 'yyyy-MM-dd'));
    }
  };
  const onDateDismiss = () => {
    if (Platform.OS === 'android') setShowDatePicker(false);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      setTimeObj(selectedTime);
      setTime(format(selectedTime, 'HH:mm'));
    }
  };
  const onTimeDismiss = () => {
    if (Platform.OS === 'android') setShowTimePicker(false);
  };

  return (
    <View style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.back()} activeOpacity={1} />
        
        <View style={s.innerSheet}>
          <View style={s.header}>
          <Text style={s.title}>Add {initialType ? ADD_TYPES.find(t => t.type === initialType)?.label : 'New'}</Text>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {showSuccess && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ backgroundColor: theme.colors.card, padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 2, borderColor: theme.brand.primary }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 8, textAlign: 'center' }}>Success!</Text>
              <Text style={{ fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center' }}>{successMessage}</Text>
            </View>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Type selector (Hide if initialType was passed) */}
          {!initialType && (
            <>
              <Text style={s.sectionLabel}>What are you adding?</Text>
              <View style={s.typeGrid}>
                {ADD_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      s.typeBtn,
                      {
                        borderColor: selectedType === t.type ? t.color : theme.colors.border,
                        backgroundColor:
                          selectedType === t.type ? t.color + '15' : theme.colors.card,
                      },
                    ]}
                    onPress={() => {
                      setSelectedType(t.type);
                      setTitle('');
                      setSelectedCourse(null);
                    }}
                  >
                    <Text style={s.typeEmoji}>{t.emoji}</Text>
                    <Text
                      style={[
                        s.typeLabel,
                        { color: selectedType === t.type ? t.color : theme.colors.text },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Form based on type */}
          {selectedType && (
            <>
              {/* Course selector */}
              <Text style={s.sectionLabel}>Course</Text>
              {courses.length === 0 ? (
                <Text style={s.noCourses}>No courses found. Add courses first.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {courses.map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        style={[
                          s.courseChip,
                          selectedCourse?.id === course.id && {
                            borderColor: course.color,
                            backgroundColor: course.color + '15',
                          },
                        ]}
                        onPress={() => {
                          setSelectedCourse(course);
                          if (course.teachers && course.teachers.length > 0) {
                            setSelectedTeacherId(course.teachers[0].id);
                          } else {
                            setSelectedTeacherId(course.teacherId ?? null);
                          }
                        }}
                      >
                        <View style={[s.courseDot, { backgroundColor: course.color }]} />
                        <Text style={s.courseChipText}>{course.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Teacher selector (if course has multiple teachers and adding class or CT) */}
              {(selectedType === 'class' || selectedType === 'ct') && selectedCourse?.teachers && selectedCourse.teachers.length > 1 && (
                <>
                  <Text style={s.sectionLabel}>Select Teacher</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {selectedCourse.teachers.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            s.courseChip,
                            selectedTeacherId === t.id && {
                              borderColor: theme.brand.primary,
                              backgroundColor: theme.brand.primary + '15',
                            },
                          ]}
                          onPress={() => setSelectedTeacherId(t.id)}
                        >
                          <Text style={s.courseChipText}>👤 {t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Title (not for class) */}
              {selectedType !== 'class' && (
                <>
                  <Text style={s.sectionLabel}>Title</Text>
                  <TextInput
                    style={s.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={
                      selectedType === 'ct'
                        ? 'e.g. CT 1'
                        : selectedType === 'assignment'
                        ? 'e.g. Lab Report 1'
                        : selectedType === 'exam'
                        ? 'e.g. Final Exam'
                        : 'Event title'
                    }
                    placeholderTextColor={theme.colors.placeholder}
                  />
                </>
              )}

              {/* Recurring Switch for Class */}
              {selectedType === 'class' && (
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Make it a recurring class</Text>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: theme.colors.border, true: theme.brand.primary }}
                  />
                </View>
              )}

              {/* Days of week for recurring */}
              {selectedType === 'class' && isRecurring && (
                <>
                  <Text style={s.sectionLabel}>Days of the week</Text>
                  <View style={s.daysGrid}>
                    {DAYS.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          s.dayBtn,
                          selectedDays.includes(d) && s.dayBtnActive,
                        ]}
                        onPress={() => toggleDay(d)}
                      >
                        <Text
                          style={[
                            s.dayBtnText,
                            selectedDays.includes(d) && s.dayBtnTextActive,
                          ]}
                        >
                          {d.charAt(0)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Date */}
              <Text style={s.sectionLabel}>
                {selectedType === 'class' && isRecurring ? 'Start Date' : 'Date'}
              </Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={s.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.placeholder}
                />
              ) : Platform.OS === 'ios' ? (
                <View style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display="spinner"
                    onValueChange={onDateChange}
                    onDismiss={onDateDismiss}
                    accentColor={theme.brand.primary}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity style={s.input} onPress={() => setShowDatePicker(true)}>
                    <Text style={{ color: theme.colors.text, fontSize: 15 }}>{date}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dateObj}
                      mode="date"
                      display="spinner"
                      onValueChange={onDateChange}
                      onDismiss={onDateDismiss}
                    />
                  )}
                </>
              )}

              {/* End Date for recurring */}
              {selectedType === 'class' && isRecurring && (
                <>
                  <Text style={s.sectionLabel}>End Date (usually end of semester)</Text>
                  <TextInput
                    style={s.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="numbers-and-punctuation"
                  />
                </>
              )}

              {/* Time (not for assignments) */}
              {selectedType !== 'assignment' && (
                <>
                  <Text style={s.sectionLabel}>Start Time</Text>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      style={s.input}
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM (24h)"
                      placeholderTextColor={theme.colors.placeholder}
                    />
                  ) : Platform.OS === 'ios' ? (
                    <View style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
                      <DateTimePicker
                        value={timeObj}
                        mode="time"
                        display="spinner"
                        onValueChange={onTimeChange}
                        onDismiss={onTimeDismiss}
                        accentColor={theme.brand.primary}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity style={s.input} onPress={() => setShowTimePicker(true)}>
                        <Text style={{ color: theme.colors.text, fontSize: 15 }}>{time}</Text>
                      </TouchableOpacity>
                      {showTimePicker && (
                        <DateTimePicker
                          value={timeObj}
                          mode="time"
                          display="spinner"
                          onValueChange={onTimeChange}
                          onDismiss={onTimeDismiss}
                        />
                      )}
                    </>
                  )}
                </>
              )}

              {/* Topic (for CT / Exam) */}
              {(selectedType === 'ct' || selectedType === 'exam') && (
                <>
                  <Text style={s.sectionLabel}>Topic / Syllabus</Text>
                  <TextInput
                    style={s.input}
                    value={topic}
                    onChangeText={setTopic}
                    placeholder="e.g. Integration, Chapter 3"
                    placeholderTextColor={theme.colors.placeholder}
                  />
                </>
              )}

              {/* Location */}
              {(selectedType === 'event' || selectedType === 'exam') && (
                <>
                  <Text style={s.sectionLabel}>Location (optional)</Text>
                  <TextInput
                    style={s.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Exam Hall B"
                    placeholderTextColor={theme.colors.placeholder}
                  />
                </>
              )}

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>
                  {selectedType === 'class' ? '📚 Add Class' : '✅ Save'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
