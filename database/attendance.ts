// ============================================================
// CLASSLY — Attendance Repository
// ============================================================
import { getDb } from './db';
import type { AttendanceRecord, AttendanceStatus } from '@/types';

export async function upsertAttendance(record: AttendanceRecord): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO attendance_records
      (id, class_session_id, course_id, semester_id, date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       notes = excluded.notes,
       updated_at = excluded.updated_at`,
    [
      record.id,
      record.classSessionId,
      record.courseId,
      record.semesterId,
      record.date,
      record.status,
      record.notes ?? null,
      record.createdAt,
      record.updatedAt,
    ]
  );
}

export async function getAttendanceBySession(classSessionId: string): Promise<AttendanceRecord | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM attendance_records WHERE class_session_id = ?',
    [classSessionId]
  );
  return row ? rowToAttendance(row) : null;
}

export async function getAttendanceByCourse(courseId: string): Promise<AttendanceRecord[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM attendance_records WHERE course_id = ? ORDER BY date',
    [courseId]
  );
  return rows.map(rowToAttendance);
}

export async function getAttendanceBySemester(semesterId: string): Promise<AttendanceRecord[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM attendance_records WHERE semester_id = ? ORDER BY date',
    [semesterId]
  );
  return rows.map(rowToAttendance);
}

// Get attendance count breakdown for a course
export async function getAttendanceSummary(courseId: string): Promise<{
  present: number;
  absent: number;
  late: number;
  excused: number;
}> {
  const db = getDb();
  const rows = await db.getAllAsync<{ status: AttendanceStatus; count: number }>(
    `SELECT status, COUNT(*) as count
     FROM attendance_records
     WHERE course_id = ?
     GROUP BY status`,
    [courseId]
  );

  const result = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const row of rows) {
    result[row.status] = row.count;
  }
  return result;
}

export async function updateAttendanceStatus(
  id: string,
  status: AttendanceStatus,
  updatedAt: string
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE attendance_records SET status = ?, updated_at = ? WHERE id = ?',
    [status, updatedAt, id]
  );
}

export async function deleteAttendance(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM attendance_records WHERE id = ?', [id]);
}

function rowToAttendance(row: any): AttendanceRecord {
  return {
    id: row.id,
    classSessionId: row.class_session_id,
    courseId: row.course_id,
    semesterId: row.semester_id,
    date: row.date,
    status: row.status as AttendanceStatus,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
