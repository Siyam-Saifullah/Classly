// ============================================================
// CLASSLY — Academic Events Repository (CTs, Assignments, Exams, etc.)
// ============================================================
import { getDb } from './db';
import type { AcademicEvent, AcademicEventType } from '@/types';

export async function createEvent(event: AcademicEvent): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO academic_events
      (id, semester_id, course_id, type, title, date, time, location, description, topic, deadline, is_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.semesterId,
      event.courseId ?? null,
      event.type,
      event.title,
      event.date,
      event.time ?? null,
      event.location ?? null,
      event.description ?? null,
      event.topic ?? null,
      event.deadline ?? null,
      event.isCompleted ? 1 : 0,
      event.createdAt,
      event.updatedAt,
    ]
  );
}

export async function getEventsBySemester(semesterId: string): Promise<AcademicEvent[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM academic_events WHERE semester_id = ? ORDER BY date, time',
    [semesterId]
  );
  return rows.map(rowToEvent);
}

export async function getEventsByDate(date: string, semesterId: string): Promise<AcademicEvent[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM academic_events WHERE date = ? AND semester_id = ? ORDER BY time',
    [date, semesterId]
  );
  return rows.map(rowToEvent);
}

export async function getEventsByDateRange(
  startDate: string,
  endDate: string,
  semesterId: string
): Promise<AcademicEvent[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM academic_events
     WHERE date >= ? AND date <= ? AND semester_id = ?
     ORDER BY date, time`,
    [startDate, endDate, semesterId]
  );
  return rows.map(rowToEvent);
}

export async function getEventsByCourse(courseId: string): Promise<AcademicEvent[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM academic_events WHERE course_id = ? ORDER BY date, time',
    [courseId]
  );
  return rows.map(rowToEvent);
}

export async function getEventsByType(
  type: AcademicEventType,
  semesterId: string
): Promise<AcademicEvent[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM academic_events WHERE type = ? AND semester_id = ? ORDER BY date',
    [type, semesterId]
  );
  return rows.map(rowToEvent);
}

export async function getEventById(id: string): Promise<AcademicEvent | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM academic_events WHERE id = ?', [id]);
  return row ? rowToEvent(row) : null;
}

export async function updateEvent(event: AcademicEvent): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE academic_events SET
      course_id = ?, type = ?, title = ?, date = ?, time = ?,
      location = ?, description = ?, topic = ?, deadline = ?,
      is_completed = ?, updated_at = ?
     WHERE id = ?`,
    [
      event.courseId ?? null,
      event.type,
      event.title,
      event.date,
      event.time ?? null,
      event.location ?? null,
      event.description ?? null,
      event.topic ?? null,
      event.deadline ?? null,
      event.isCompleted ? 1 : 0,
      event.updatedAt,
      event.id,
    ]
  );
}

export async function toggleEventCompleted(id: string, isCompleted: boolean, updatedAt: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE academic_events SET is_completed = ?, updated_at = ? WHERE id = ?',
    [isCompleted ? 1 : 0, updatedAt, id]
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM academic_events WHERE id = ?', [id]);
}

// Upcoming events from today forward
export async function getUpcomingEvents(semesterId: string, fromDate: string): Promise<AcademicEvent[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM academic_events
     WHERE semester_id = ? AND date >= ?
     ORDER BY date, time`,
    [semesterId, fromDate]
  );
  return rows.map(rowToEvent);
}

function rowToEvent(row: any): AcademicEvent {
  return {
    id: row.id,
    semesterId: row.semester_id,
    courseId: row.course_id ?? undefined,
    type: row.type as AcademicEventType,
    title: row.title,
    date: row.date,
    time: row.time ?? undefined,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    topic: row.topic ?? undefined,
    deadline: row.deadline ?? undefined,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
