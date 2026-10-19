// ============================================================
// CLASSLY — Attendance Calculation Utilities
// All attendance math lives here. Never duplicate these in UI.
// ============================================================
import type {
  AttendanceRecord,
  AttendanceStats,
  AttendanceStatusLevel,
  Course,
  CourseColor,
} from '@/types';
import { ATTENDANCE_BUFFER_WARNING, ATTENDANCE_BUFFER_SAFE } from '@/theme';

// How many classes are "attended" — Present and Late both count
function countAttended(records: AttendanceRecord[]): number {
  return records.filter((r) => r.status === 'present' || r.status === 'late').length;
}

// How many classes have been held (all records = held, cancelled sessions never get records)
function countHeld(records: AttendanceRecord[]): number {
  return records.length;
}

/**
 * Calculate attendance percentage.
 * Returns 100 if no classes held yet (avoids division by zero).
 */
export function calculateAttendancePercentage(
  attended: number,
  held: number
): number {
  if (held === 0) return 100;
  return Math.round((attended / held) * 1000) / 10; // 1 decimal place
}

/**
 * Determine attendance status level based on current % and requirement.
 * - safe: >= requirement + SAFE buffer
 * - warning: >= requirement but < requirement + WARNING buffer
 * - critical: < requirement
 */
export function calculateAttendanceStatus(
  percentage: number,
  requirement: number
): AttendanceStatusLevel {
  if (percentage >= requirement + ATTENDANCE_BUFFER_SAFE) return 'safe';
  if (percentage >= requirement) return 'warning';
  return 'critical';
}

/**
 * Calculate how many more classes a student can miss
 * and still stay AT OR ABOVE the requirement.
 *
 * Formula:
 *   After missing M more classes:
 *   (attended) / (held + M) >= requirement / 100
 *   attended >= (requirement / 100) * (held + M)
 *   attended / (requirement / 100) >= held + M
 *   M <= attended / (requirement / 100) - held
 *
 * Returns 0 if already below requirement.
 */
export function calculateMissableClasses(
  attended: number,
  held: number,
  requirement: number
): number {
  if (requirement <= 0) return Infinity;
  const maxTotal = Math.floor(attended / (requirement / 100));
  const canMiss = maxTotal - held;
  return Math.max(0, canMiss);
}

/**
 * Calculate how many consecutive classes a student must attend
 * to reach the target percentage (default = requirement).
 *
 * Formula:
 *   (attended + N) / (held + N) >= target / 100
 *   attended + N >= (target / 100) * (held + N)
 *   attended + N >= (target/100)*held + (target/100)*N
 *   N - (target/100)*N >= (target/100)*held - attended
 *   N * (1 - target/100) >= (target/100)*held - attended
 *   N >= ((target/100)*held - attended) / (1 - target/100)
 *
 * Returns 0 if already at or above target.
 */
export function calculateRequiredClasses(
  attended: number,
  held: number,
  target: number
): number {
  if (target >= 100) return Infinity; // Can't reach 100% if already missed any
  const currentPct = calculateAttendancePercentage(attended, held);
  if (currentPct >= target) return 0;

  const r = target / 100;
  const needed = Math.ceil((r * held - attended) / (1 - r));
  return Math.max(0, needed);
}

/**
 * Project attendance % after attending N more classes (no misses).
 */
export function projectAttendanceIfAttend(
  attended: number,
  held: number,
  additionalClasses: number
): number {
  return calculateAttendancePercentage(
    attended + additionalClasses,
    held + additionalClasses
  );
}

/**
 * Build complete AttendanceStats for a course given its records.
 * This is the main function used by the UI.
 */
export function buildAttendanceStats(
  course: Course,
  records: AttendanceRecord[],
  requirement: number
): AttendanceStats {
  const held = countHeld(records);
  const attended = countAttended(records);
  const percentage = calculateAttendancePercentage(attended, held);
  const status = calculateAttendanceStatus(percentage, requirement);
  const canMiss = calculateMissableClasses(attended, held, requirement);
  const requiresAttend = calculateRequiredClasses(attended, held, requirement);

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;

  return {
    courseId: course.id,
    courseName: course.name,
    courseColor: course.color as CourseColor,
    totalHeld: held,
    totalAttended: attended,
    percentage,
    status,
    canMiss,
    requiresAttend,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
  };
}

/**
 * Build overall attendance stats across all courses in a semester.
 * Aggregates all records together.
 */
export function buildOverallAttendanceStats(
  statsPerCourse: AttendanceStats[]
): {
  percentage: number;
  totalHeld: number;
  totalAttended: number;
  status: AttendanceStatusLevel;
  warningCourses: AttendanceStats[];
  criticalCourses: AttendanceStats[];
} {
  const totalHeld = statsPerCourse.reduce((sum, s) => sum + s.totalHeld, 0);
  const totalAttended = statsPerCourse.reduce((sum, s) => sum + s.totalAttended, 0);
  const percentage = calculateAttendancePercentage(totalAttended, totalHeld);

  // Overall status = worst individual course status
  const hasCritical = statsPerCourse.some((s) => s.status === 'critical');
  const hasWarning = statsPerCourse.some((s) => s.status === 'warning');
  const overallStatus: AttendanceStatusLevel = hasCritical
    ? 'critical'
    : hasWarning
    ? 'warning'
    : 'safe';

  return {
    percentage,
    totalHeld,
    totalAttended,
    status: overallStatus,
    warningCourses: statsPerCourse.filter((s) => s.status === 'warning'),
    criticalCourses: statsPerCourse.filter((s) => s.status === 'critical'),
  };
}
