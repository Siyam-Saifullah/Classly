// ============================================================
// CLASSLY — Courses Repository
// All SQLite operations for courses and teachers.
// ============================================================
import { getDb } from './db';
import type { Course, Teacher } from '@/types';

// ---- Teachers ----

export async function createTeacher(teacher: Teacher): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO teachers (id, name, email, phone, department, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      teacher.id,
      teacher.name,
      teacher.email ?? null,
      teacher.phone ?? null,
      teacher.department ?? null,
      teacher.createdAt,
    ]
  );
}

export async function getAllTeachers(): Promise<Teacher[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM teachers ORDER BY name');
  return rows.map(rowToTeacher);
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM teachers WHERE id = ?', [id]);
  return row ? rowToTeacher(row) : null;
}

export async function updateTeacher(teacher: Teacher): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE teachers SET name = ?, email = ?, phone = ?, department = ? WHERE id = ?`,
    [teacher.name, teacher.email ?? null, teacher.phone ?? null, teacher.department ?? null, teacher.id]
  );
}

export async function deleteTeacher(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM teachers WHERE id = ?', [id]);
}

function rowToTeacher(row: any): Teacher {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    department: row.department ?? undefined,
    createdAt: row.created_at,
  };
}

// ---- Courses ----

export async function createCourse(course: Course): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO courses
        (id, semester_id, name, code, teacher_id, room, credit, color, default_duration_minutes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course.id,
        course.semesterId,
        course.name,
        course.code ?? null,
        course.teacherId ?? null,
        course.room ?? null,
        course.credit ?? null,
        course.color,
        course.defaultDurationMinutes,
        course.createdAt,
      ]
    );

    if (course.teachers && course.teachers.length > 0) {
      for (const t of course.teachers) {
        await db.runAsync(
          'INSERT INTO course_teachers (course_id, teacher_id) VALUES (?, ?)',
          [course.id, t.id]
        );
      }
    }
  });
}

export async function getCoursesBySemester(semesterId: string): Promise<Course[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM courses WHERE semester_id = ? ORDER BY name',
    [semesterId]
  );
  
  const courses = rows.map(rowToCourse);
  
  for (const course of courses) {
    const teacherRows = await db.getAllAsync<any>(
      `SELECT t.* FROM teachers t
       JOIN course_teachers ct ON ct.teacher_id = t.id
       WHERE ct.course_id = ?`,
      [course.id]
    );
    course.teachers = teacherRows.map(rowToTeacher);
    
    // Fallback for legacy single teacher
    if (course.teachers.length === 0 && course.teacherId) {
      const t = await getTeacherById(course.teacherId);
      if (t) course.teachers = [t];
    }
  }
  
  return courses;
}

export async function getCourseById(id: string): Promise<Course | null> {
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM courses WHERE id = ?', [id]);
  if (!row) return null;
  
  const course = rowToCourse(row);
  const teacherRows = await db.getAllAsync<any>(
    `SELECT t.* FROM teachers t
     JOIN course_teachers ct ON ct.teacher_id = t.id
     WHERE ct.course_id = ?`,
    [course.id]
  );
  course.teachers = teacherRows.map(rowToTeacher);
  
  if (course.teachers.length === 0 && course.teacherId) {
    const t = await getTeacherById(course.teacherId);
    if (t) course.teachers = [t];
  }
  
  return course;
}

export async function updateCourse(course: Course): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE courses SET
        name = ?, code = ?, teacher_id = ?, room = ?, credit = ?,
        color = ?, default_duration_minutes = ?
       WHERE id = ?`,
      [
        course.name,
        course.code ?? null,
        course.teacherId ?? null,
        course.room ?? null,
        course.credit ?? null,
        course.color,
        course.defaultDurationMinutes,
        course.id,
      ]
    );

    await db.runAsync('DELETE FROM course_teachers WHERE course_id = ?', [course.id]);
    
    if (course.teachers && course.teachers.length > 0) {
      for (const t of course.teachers) {
        await db.runAsync(
          'INSERT INTO course_teachers (course_id, teacher_id) VALUES (?, ?)',
          [course.id, t.id]
        );
      }
    }
  });
}

export async function deleteCourse(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM courses WHERE id = ?', [id]);
}

function rowToCourse(row: any): Course {
  return {
    id: row.id,
    semesterId: row.semester_id,
    name: row.name,
    code: row.code ?? undefined,
    teacherId: row.teacher_id ?? undefined,
    room: row.room ?? undefined,
    credit: row.credit ?? undefined,
    color: row.color,
    defaultDurationMinutes: row.default_duration_minutes,
    createdAt: row.created_at,
  };
}
