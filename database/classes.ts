// ============================================================
// CLASSLY — Class Sessions Repository
// All SQLite operations for class sessions.
// ============================================================
import { getDb } from './db';
import type { ClassSession } from '@/types';

export async function createClassSession(session: ClassSession): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO class_sessions
      (id, course_id, semester_id, date, start_time, end_time, room, topic, notes, recurrence_group_id, teacher_id, is_cancelled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.courseId,
      session.semesterId,
      session.date,
      session.startTime,
      session.endTime,
      session.room ?? null,
      session.topic ?? null,
      session.notes ?? null,
      session.recurrenceGroupId ?? null,
      session.teacherId ?? null,
      session.isCancelled ? 1 : 0,
      session.createdAt,
    ]
  );
}

export async function createClassSessionsBatch(sessions: ClassSession[]): Promise<void> {
  const db = getDb();
  // Use a transaction for batch inserts — much faster
  await db.withTransactionAsync(async () => {
    for (const session of sessions) {
      await db.runAsync(
        `INSERT INTO class_sessions
          (id, course_id, semester_id, date, start_time, end_time, room, topic, notes, recurrence_group_id, teacher_id, is_cancelled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.courseId,
          session.semesterId,
          session.date,
          session.startTime,
          session.endTime,
          session.room ?? null,
          session.topic ?? null,
          session.notes ?? null,
          session.recurrenceGroupId ?? null,
          session.teacherId ?? null,
          session.isCancelled ? 1 : 0,
          session.createdAt,
        ]
      );
    }
  });
}

export async function getClassSessionsByDate(date: string, semesterId: string): Promise<ClassSession[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM class_sessions
     WHERE date = ? AND semester_id = ? AND is_cancelled = 0
     ORDER BY start_time`,
    [date, semesterId]
  );
  return rows.map(rowToClassSession);
}

export async function getClassSessionsByCourse(courseId: string): Promise<ClassSession[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM class_sessions WHERE course_id = ? ORDER BY date, start_time`,
    [courseId]
  );
  return rows.map(rowToClassSession);
}

export async function getClassSessionsByDateRange(
  startDate: string,
  endDate: string,
  semesterId: string
): Promise<ClassSession[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM class_sessions
     WHERE date >= ? AND date <= ? AND semester_id = ?
     ORDER BY date, start_time`,
    [startDate, endDate, semesterId]
  );
  return rows.map(rowToClassSession);
}

export async function getClassSessionById(id: string): Promise<ClassSession | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM class_sessions WHERE id = ?', [id]);
  return row ? rowToClassSession(row) : null;
}

export async function updateClassSession(session: ClassSession): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE class_sessions SET
      date = ?, start_time = ?, end_time = ?, room = ?, topic = ?, notes = ?, teacher_id = ?, is_cancelled = ?
     WHERE id = ?`,
    [
      session.date,
      session.startTime,
      session.endTime,
      session.room ?? null,
      session.topic ?? null,
      session.notes ?? null,
      session.teacherId ?? null,
      session.isCancelled ? 1 : 0,
      session.id,
    ]
  );
}

export async function updateRecurringSeriesTime(
  recurrenceGroupId: string,
  startTime: string,
  endTime: string,
  fromDate: string
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE class_sessions
     SET start_time = ?, end_time = ?
     WHERE recurrence_group_id = ? AND date >= ?`,
    [startTime, endTime, recurrenceGroupId, fromDate]
  );
}

export async function deleteClassSession(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM class_sessions WHERE id = ?', [id]);
}

export async function deleteRecurringSeries(recurrenceGroupId: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'DELETE FROM class_sessions WHERE recurrence_group_id = ?',
    [recurrenceGroupId]
  );
}

// Count held (non-cancelled) sessions for a course
export async function countHeldSessions(courseId: string): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM class_sessions WHERE course_id = ? AND is_cancelled = 0',
    [courseId]
  );
  return row?.count ?? 0;
}

export async function getClassSessionsBySemester(semesterId: string): Promise<ClassSession[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM class_sessions WHERE semester_id = ? ORDER BY date, start_time',
    [semesterId]
  );
  return rows.map(rowToClassSession);
}

function rowToClassSession(row: any): ClassSession {
  return {
    id: row.id,
    courseId: row.course_id,
    semesterId: row.semester_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room ?? undefined,
    topic: row.topic ?? undefined,
    notes: row.notes ?? undefined,
    recurrenceGroupId: row.recurrence_group_id ?? undefined,
    teacherId: row.teacher_id ?? undefined,
    isCancelled: row.is_cancelled === 1,
    createdAt: row.created_at,
  };
}
