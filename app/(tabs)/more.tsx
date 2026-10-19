// ============================================================
// CLASSLY — Settings / More Screen
// Profile, Semester, Courses quick-access, Notifications, App.
// ============================================================
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { useAppStore } from '@/store/appStore';
import { getSettings, saveSettings } from '@/database/settings';
import { getCoursesBySemester } from '@/database/courses';
import { requestNotificationPermissions, cancelAllScheduledNotifications } from '@/utils/notifications';
import type { AppSettings, Course } from '@/types';

const T = {
  bg: '#090a0f',
  card: '#121522',
  border: '#20263b',
  borderInner: '#181d2f',
  text: '#ffffff',
  textSub: '#a1a1aa',
  textDim: '#71717a',
  brand: '#8b5cf6',
  brandLight: 'rgba(139,92,246,0.15)',
};

export default function MoreScreen() {
  const { profile, activeSemester, settings, setSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(settings);
  const [courses, setCourses] = useState<Course[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLocalSettings(settings);
      if (activeSemester) {
        getCoursesBySemester(activeSemester.id)
          .then(setCourses)
          .catch(console.error);
      } else {
        setCourses([]);
      }
    }, [settings, activeSemester?.id])
  );

  async function toggleNotifications(value: boolean) {
    if (!localSettings) return;
    if (value) await requestNotificationPermissions();
    else await cancelAllScheduledNotifications();
    const updated = { ...localSettings, notificationsEnabled: value };
    await saveSettings(updated);
    setSettings(updated);
    setLocalSettings(updated);
  }

  async function toggleAttendanceWarning(value: boolean) {
    if (!localSettings) return;
    const updated = { ...localSettings, attendanceWarningEnabled: value };
    await saveSettings(updated);
    setSettings(updated);
    setLocalSettings(updated);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ──────────────────────────────────── */}
        <Text style={s.pageTitle}>Settings</Text>

        {/* ── Profile Card ────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>PROFILE</Text>
          <TouchableOpacity
            style={s.profileCard}
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.8}
          >
            <View style={[s.avatar, { backgroundColor: profile?.avatarColor ?? T.brand }]}>
              <Text style={s.avatarText}>{profile?.name?.charAt(0).toUpperCase() ?? 'S'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{profile?.name ?? 'Student'}</Text>
              {profile?.universityName && <Text style={s.profileSub}>{profile.universityName}</Text>}
              {profile?.department && <Text style={s.profileSub}>{profile.department}</Text>}
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Semester Card ───────────────────────────── */}
        {activeSemester && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>CURRENT SEMESTER</Text>
            <View style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.semName} numberOfLines={0}>{activeSemester.name}</Text>
                  <Text style={s.semSub}>{activeSemester.startDate} → {activeSemester.endDate}</Text>
                </View>
                <View style={[s.reqBadge, { backgroundColor: T.brandLight, borderColor: T.brand }]}>
                  <Text style={[s.reqBadgeText, { color: T.brand }]}>
                    {activeSemester.attendanceRequirement}% req.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Courses Section ─────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>COURSES</Text>
            <TouchableOpacity
              style={s.addCourseBtn}
              onPress={() => router.push('/modals/addCourse')}
            >
              <Text style={s.addCourseBtnText}>+ Add Course</Text>
            </TouchableOpacity>
          </View>

          {courses.length === 0 ? (
            <TouchableOpacity
              style={s.emptyCoursesCard}
              onPress={() => router.push('/modals/addCourse')}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>📚</Text>
              <Text style={s.emptyText}>No courses yet. Tap to add your first course.</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.coursesList}>
              {courses.map((course, i) => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    s.courseItem,
                    i === courses.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => router.push(`/course/${course.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={[s.courseColor, { backgroundColor: course.color }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.courseName}>
                      {course.name}
                    </Text>
                    {(course.code || (course.teachers && course.teachers.length > 0)) && (
                      <Text style={s.courseSub}>
                        {[course.code, course.teachers?.map((t) => t.name).join(', ')].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[s.editCourseBtn, { backgroundColor: `${course.color}20`, borderColor: `${course.color}40` }]}
                    onPress={() => router.push({ pathname: '/modals/editCourse', params: { id: course.id } } as any)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[s.editCourseBtnText, { color: course.color }]}>✎ Edit</Text>
                  </TouchableOpacity>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Notifications ───────────────────────────── */}
        {localSettings && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
            <View style={s.card}>
              <View style={s.settingsRow}>
                <Text style={s.settingsEmoji}>🔔</Text>
                <Text style={s.settingsLabel}>Push Notifications</Text>
                <Switch
                  value={localSettings.notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: T.border, true: T.brand }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[s.settingsRow, { borderBottomWidth: 0 }]}>
                <Text style={s.settingsEmoji}>⚠️</Text>
                <Text style={s.settingsLabel}>Attendance Warnings</Text>
                <Switch
                  value={localSettings.attendanceWarningEnabled}
                  onValueChange={toggleAttendanceWarning}
                  trackColor={{ false: T.border, true: T.brand }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        )}

        {/* ── App ─────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>APP</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.settingsRow} onPress={() => router.push('/onboarding')}>
              <Text style={s.settingsEmoji}>🎓</Text>
              <Text style={s.settingsLabel}>Re-run Onboarding</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.settingsRow} onPress={() => router.push('/(tabs)/attendance' as any)}>
              <Text style={s.settingsEmoji}>📊</Text>
              <Text style={s.settingsLabel}>View Attendance</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
            <View style={[s.settingsRow, { borderBottomWidth: 0 }]}>
              <Text style={s.settingsEmoji}>ℹ️</Text>
              <Text style={s.settingsLabel}>Version</Text>
              <Text style={[s.settingsLabel, { color: T.textDim }]}>1.0.0</Text>
            </View>
          </View>
        </View>

        <Text style={s.footer}>Classly · Your Semester, Organized.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1, paddingHorizontal: 16 },

  pageTitle: {
    fontSize: 32, fontWeight: '800', color: T.text,
    letterSpacing: -0.5, marginTop: 12, marginBottom: 20,
  },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: T.textDim,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },

  card: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
  },

  // Profile
  profileCard: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 17, fontWeight: '700', color: T.text },
  profileSub: { fontSize: 13, color: T.textSub, marginTop: 2 },
  chevron: { fontSize: 22, color: T.textDim },

  // Semester
  semName: { fontSize: 17, fontWeight: '700', color: T.text },
  semSub: { fontSize: 12, color: T.textSub, marginTop: 4 },
  reqBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  reqBadgeText: { fontSize: 12, fontWeight: '700' },

  // Courses
  addCourseBtn: {
    backgroundColor: '#7c3aed', paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  addCourseBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyCoursesCard: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    padding: 24, alignItems: 'center',
  },
  emptyText: { color: T.textSub, fontSize: 13, textAlign: 'center' },
  coursesList: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
  },
  courseItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    gap: 12, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  courseColor: { width: 4, height: 40, borderRadius: 2 },
  courseName: { fontSize: 15, fontWeight: '600', color: T.text },
  courseSub: { fontSize: 12, color: T.textSub, marginTop: 2 },
  editCourseBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  editCourseBtnText: { fontSize: 11, fontWeight: '700' },

  // Settings rows
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: T.border, gap: 12,
  },
  settingsEmoji: { fontSize: 20 },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: T.text },

  footer: { textAlign: 'center', fontSize: 12, color: T.textDim, marginTop: 8, marginBottom: 32 },
});
