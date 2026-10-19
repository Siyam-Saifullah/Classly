// ============================================================
// CLASSLY — Settings & Profile Repository
// ============================================================
import { getDb } from './db';
import type { AppSettings, UserProfile, Semester } from '@/types';

// ---- App Settings ----

export async function getSettings(): Promise<AppSettings | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>("SELECT * FROM app_settings WHERE id = 'default'");
  return row ? rowToSettings(row) : null;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO app_settings
      (id, notifications_enabled, class_reminder_minutes, assignment_reminder_hours,
       ct_reminder_hours, exam_reminder_hours, attendance_warning_enabled, theme,
       onboarding_completed, active_profile_id, active_semester_id)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       notifications_enabled = excluded.notifications_enabled,
       class_reminder_minutes = excluded.class_reminder_minutes,
       assignment_reminder_hours = excluded.assignment_reminder_hours,
       ct_reminder_hours = excluded.ct_reminder_hours,
       exam_reminder_hours = excluded.exam_reminder_hours,
       attendance_warning_enabled = excluded.attendance_warning_enabled,
       theme = excluded.theme,
       onboarding_completed = excluded.onboarding_completed,
       active_profile_id = excluded.active_profile_id,
       active_semester_id = excluded.active_semester_id`,
    [
      settings.notificationsEnabled ? 1 : 0,
      settings.classReminderMinutes,
      settings.assignmentReminderHours,
      settings.ctReminderHours,
      settings.examReminderHours,
      settings.attendanceWarningEnabled ? 1 : 0,
      settings.theme,
      settings.onboardingCompleted ? 1 : 0,
      settings.activeProfileId ?? null,
      settings.activeSemesterId ?? null,
    ]
  );
}

function rowToSettings(row: any): AppSettings {
  return {
    notificationsEnabled: row.notifications_enabled === 1,
    classReminderMinutes: row.class_reminder_minutes,
    assignmentReminderHours: row.assignment_reminder_hours,
    ctReminderHours: row.ct_reminder_hours,
    examReminderHours: row.exam_reminder_hours,
    attendanceWarningEnabled: row.attendance_warning_enabled === 1,
    theme: row.theme as 'light' | 'dark' | 'system',
    onboardingCompleted: row.onboarding_completed === 1,
    activeProfileId: row.active_profile_id ?? undefined,
    activeSemesterId: row.active_semester_id ?? undefined,
  };
}

// ---- User Profiles ----

export async function createProfile(profile: UserProfile): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO user_profiles (id, name, university_name, department, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [profile.id, profile.name, profile.universityName, profile.department, profile.avatarColor, profile.createdAt]
  );
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_profiles WHERE id = ?', [id]);
  return row ? rowToProfile(row) : null;
}

export async function updateProfile(profile: UserProfile): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE user_profiles SET name = ?, university_name = ?, department = ?, avatar_color = ? WHERE id = ?',
    [profile.name, profile.universityName, profile.department, profile.avatarColor, profile.id]
  );
}

function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    universityName: row.university_name,
    department: row.department,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

// ---- Semesters ----

export async function createSemester(semester: Semester): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO semesters (id, name, start_date, end_date, attendance_requirement, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      semester.id,
      semester.name,
      semester.startDate,
      semester.endDate,
      semester.attendanceRequirement,
      semester.isActive ? 1 : 0,
      semester.createdAt,
    ]
  );
}

export async function getAllSemesters(): Promise<Semester[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM semesters ORDER BY start_date DESC');
  return rows.map(rowToSemester);
}

export async function getActiveSemester(): Promise<Semester | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM semesters WHERE is_active = 1 LIMIT 1');
  return row ? rowToSemester(row) : null;
}

export async function getSemesterById(id: string): Promise<Semester | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM semesters WHERE id = ?', [id]);
  return row ? rowToSemester(row) : null;
}

export async function setActiveSemester(id: string): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE semesters SET is_active = 0');
    await db.runAsync('UPDATE semesters SET is_active = 1 WHERE id = ?', [id]);
  });
}

export async function updateSemester(semester: Semester): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE semesters SET name = ?, start_date = ?, end_date = ?, attendance_requirement = ?, is_active = ?
     WHERE id = ?`,
    [
      semester.name,
      semester.startDate,
      semester.endDate,
      semester.attendanceRequirement,
      semester.isActive ? 1 : 0,
      semester.id,
    ]
  );
}

function rowToSemester(row: any): Semester {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    attendanceRequirement: row.attendance_requirement,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}
