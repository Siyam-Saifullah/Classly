// ============================================================
// CLASSLY — Core TypeScript Types
// All data shapes live here. Import from '@/types'.
// ============================================================

// ------ User / Onboarding ------

export interface UserProfile {
  id: string;
  name: string;
  universityName: string;
  department: string;
  avatarColor: string; // Hex color for avatar placeholder
  createdAt: string;   // ISO date string
}

// ------ Semester ------

export interface Semester {
  id: string;
  name: string;            // e.g. "Fall 2026"
  startDate: string;       // ISO date string
  endDate: string;         // ISO date string
  attendanceRequirement: number; // e.g. 60 (percent)
  isActive: boolean;
  createdAt: string;
}

// ------ Teacher ------

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  createdAt: string;
}

// ------ Course ------

export type CourseColor =
  | '#6366f1' // Indigo
  | '#ec4899' // Pink
  | '#f59e0b' // Amber
  | '#10b981' // Emerald
  | '#3b82f6' // Blue
  | '#8b5cf6' // Violet
  | '#ef4444' // Red
  | '#14b8a6' // Teal
  | '#f97316' // Orange
  | '#06b6d4'; // Cyan

export interface Course {
  id: string;
  semesterId: string;
  name: string;
  code?: string;            // e.g. "MAT 101"
  teacherId?: string;       // FK -> Teacher (Legacy or primary)
  teachers?: Teacher[];     // Used for multiple teachers mapping
  room?: string;
  credit?: number;
  color: CourseColor;
  defaultDurationMinutes: number; // e.g. 60
  createdAt: string;
}

// ------ Class Session ------

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface RecurrenceRule {
  days: WeekDay[];        // Which days of the week
  startDate: string;      // ISO date
  endDate: string;        // ISO date
  startTime: string;      // "HH:mm" format
  endTime: string;        // "HH:mm" format
}

export interface ClassSession {
  id: string;
  courseId: string;
  semesterId: string;
  date: string;           // ISO date string (YYYY-MM-DD)
  startTime: string;      // "HH:mm"
  endTime: string;        // "HH:mm"
  room?: string;          // Override course default
  topic?: string;
  notes?: string;
  recurrenceGroupId?: string; // Links recurring sessions together
  teacherId?: string;         // The teacher who took this class
  isCancelled: boolean;
  createdAt: string;
}

// ------ Attendance ------

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  courseId: string;
  semesterId: string;
  date: string;           // ISO date string
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Computed attendance stats - not stored, calculated at runtime
export interface AttendanceStats {
  courseId: string;
  courseName: string;
  courseColor: CourseColor;
  totalHeld: number;       // Classes held (not cancelled)
  totalAttended: number;   // Present + Late
  percentage: number;      // 0-100
  status: AttendanceStatusLevel;
  canMiss: number;         // How many more can be missed and stay safe
  requiresAttend: number;  // Classes needed to reach requirement
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
}

export type AttendanceStatusLevel = 'safe' | 'warning' | 'critical';

// ------ Academic Events ------

export type AcademicEventType =
  | 'class'
  | 'ct'          // Class Test
  | 'assignment'
  | 'exam'
  | 'presentation'
  | 'lab'
  | 'project'
  | 'event'
  | 'other';

export interface AcademicEvent {
  id: string;
  semesterId: string;
  courseId?: string;       // Optional - some events are not course-specific
  type: AcademicEventType;
  title: string;
  date: string;            // ISO date string
  time?: string;           // "HH:mm" - optional for deadlines
  location?: string;
  description?: string;
  topic?: string;          // Relevant for CT/Exams
  deadline?: string;       // ISO datetime for assignments
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ------ Notifications ------

export type NotificationTriggerType =
  | 'class_reminder'
  | 'assignment_due'
  | 'ct_reminder'
  | 'exam_reminder'
  | 'attendance_warning';

export interface ScheduledNotification {
  id: string;
  type: NotificationTriggerType;
  referenceId: string;   // ID of the related entity
  scheduledFor: string;  // ISO datetime
  title: string;
  body: string;
  expoNotificationId?: string;
  createdAt: string;
}

// ------ App Settings ------

export interface AppSettings {
  notificationsEnabled: boolean;
  classReminderMinutes: number;   // e.g. 30
  assignmentReminderHours: number;
  ctReminderHours: number;
  examReminderHours: number;
  attendanceWarningEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  onboardingCompleted: boolean;
  activeProfileId?: string;
  activeSemesterId?: string;
}

// ------ UI Helpers ------

export type UpcomingGroup = 'today' | 'tomorrow' | 'this_week' | 'later';

export interface UpcomingItem {
  id: string;
  type: AcademicEventType | 'class';
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  courseColor?: CourseColor;
  group: UpcomingGroup;
  isCompleted: boolean;
}
