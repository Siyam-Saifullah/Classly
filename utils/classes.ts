// ============================================================
// CLASSLY — Recurring Class Generation Utility
// ============================================================
import { addDays, format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import type { ClassSession, RecurrenceRule, WeekDay, Course } from '@/types';
import { generateId } from './ids';

const WEEKDAY_MAP: Record<WeekDay, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Generate ClassSession objects for a recurring schedule.
 * e.g. Every Monday and Wednesday from Oct 1 to Jan 15 at 10:00-11:00.
 *
 * All generated sessions share the same recurrenceGroupId so they
 * can be edited/deleted as a group.
 */
export function generateRecurringClasses(
  course: Course,
  rule: RecurrenceRule,
  recurrenceGroupId: string
): ClassSession[] {
  const sessions: ClassSession[] = [];
  const start = parseISO(rule.startDate);
  const end = parseISO(rule.endDate);
  const now = new Date().toISOString();

  let current = start;

  while (isBefore(current, end) || isEqual(current, end)) {
    const dayOfWeek = current.getDay(); // 0 = Sunday
    const matchesDay = rule.days.some(
      (d) => WEEKDAY_MAP[d] === dayOfWeek
    );

    if (matchesDay) {
      sessions.push({
        id: generateId(),
        courseId: course.id,
        semesterId: course.semesterId,
        date: format(current, 'yyyy-MM-dd'),
        startTime: rule.startTime,
        endTime: rule.endTime,
        room: course.room,
        isCancelled: false,
        recurrenceGroupId,
        createdAt: now,
      });
    }

    current = addDays(current, 1);
  }

  return sessions;
}

/**
 * Calculate the end time given a start time and duration in minutes.
 * e.g. startTime="10:00", durationMinutes=90 -> "11:30"
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Format a time string for display.
 * "14:30" -> "2:30 PM"
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Format a date string for display.
 * "2026-10-01" -> "Oct 1, 2026"
 */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

/**
 * Format a date string for short display.
 * "2026-10-01" -> "Oct 1"
 */
export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d');
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get the greeting based on current time.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
