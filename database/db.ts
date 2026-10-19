// ============================================================
// CLASSLY — SQLite Database Initialization
// Opens (or creates) the database and runs all migrations.
// Call initDatabase() once at app startup.
// ============================================================
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('classly.db');

  // Enable WAL mode for better performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);
}

// ============================================================
// MIGRATIONS
// Add new migrations as numbered objects. Never edit old ones.
// ============================================================

interface Migration {
  version: number;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      -- User Profiles
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        university_name TEXT NOT NULL,
        department TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#6366f1',
        created_at TEXT NOT NULL
      );

      -- App Settings (single row, id = 'default')
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        class_reminder_minutes INTEGER NOT NULL DEFAULT 30,
        assignment_reminder_hours INTEGER NOT NULL DEFAULT 24,
        ct_reminder_hours INTEGER NOT NULL DEFAULT 24,
        exam_reminder_hours INTEGER NOT NULL DEFAULT 48,
        attendance_warning_enabled INTEGER NOT NULL DEFAULT 1,
        theme TEXT NOT NULL DEFAULT 'system',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        active_profile_id TEXT,
        active_semester_id TEXT
      );

      -- Semesters
      CREATE TABLE IF NOT EXISTS semesters (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        attendance_requirement REAL NOT NULL DEFAULT 60,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      -- Teachers
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        department TEXT,
        created_at TEXT NOT NULL
      );

      -- Courses
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY NOT NULL,
        semester_id TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT,
        teacher_id TEXT,
        room TEXT,
        credit REAL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        default_duration_minutes INTEGER NOT NULL DEFAULT 60,
        created_at TEXT NOT NULL,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
      );

      -- Class Sessions
      CREATE TABLE IF NOT EXISTS class_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        course_id TEXT NOT NULL,
        semester_id TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        room TEXT,
        topic TEXT,
        notes TEXT,
        recurrence_group_id TEXT,
        is_cancelled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
      );

      -- Attendance Records
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY NOT NULL,
        class_session_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        semester_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'absent',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      -- Academic Events (CTs, Assignments, Exams, Presentations, etc.)
      CREATE TABLE IF NOT EXISTS academic_events (
        id TEXT PRIMARY KEY NOT NULL,
        semester_id TEXT NOT NULL,
        course_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        location TEXT,
        description TEXT,
        topic TEXT,
        deadline TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
      );

      -- Schema version tracker
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      -- Junction table for multiple teachers per course
      CREATE TABLE IF NOT EXISTS course_teachers (
        course_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        PRIMARY KEY (course_id, teacher_id),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
      );

      -- Add teacher_id to class_sessions to track which teacher took the class
      ALTER TABLE class_sessions ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
    `,
  },
];

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure the version table exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY NOT NULL
    );
  `);

  // Get current version
  const row = await database.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_version'
  );
  const currentVersion = row?.version ?? 0;

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await database.execAsync(migration.sql);
      await database.runAsync(
        'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
        [migration.version]
      );
      console.log(`[DB] Migration v${migration.version} applied`);
    }
  }
}
