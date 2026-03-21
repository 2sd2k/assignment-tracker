import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:assignments.db");
    await initSchema();
  }
  return db;
}

async function initSchema() {
  const d = db!;

  await d.execute(`
    CREATE TABLE IF NOT EXISTS platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT,
      session_cookies TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER REFERENCES platforms(id),
      external_id TEXT,
      name TEXT NOT NULL,
      color TEXT,
      UNIQUE(platform_id, external_id)
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      external_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_at TEXT,
      platform_url TEXT,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      is_manual INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(course_id, external_id)
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hours_before INTEGER NOT NULL,
      enabled INTEGER DEFAULT 1
    )
  `);

  // Migrate: add is_pinned column if it doesn't exist yet
  try {
    await d.execute(
      "ALTER TABLE assignments ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0"
    );
  } catch {
    // Column already exists — safe to ignore
  }

  // Unique index so INSERT OR IGNORE works for custom notifications
  try {
    await d.execute(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_hours ON notification_settings (hours_before)"
    );
  } catch {
    // Already exists
  }

  // Remove duplicate notification settings (keep lowest id per hours_before)
  await d.execute(
    `DELETE FROM notification_settings
     WHERE id NOT IN (
       SELECT MIN(id) FROM notification_settings GROUP BY hours_before
     )`
  );

  // Insert default notification settings if empty
  const settings = await d.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM notification_settings"
  );
  if (settings[0].count === 0) {
    await d.execute(
      "INSERT INTO notification_settings (hours_before, enabled) VALUES (24, 1)"
    );
    await d.execute(
      "INSERT INTO notification_settings (hours_before, enabled) VALUES (6, 1)"
    );
    await d.execute(
      "INSERT INTO notification_settings (hours_before, enabled) VALUES (1, 1)"
    );
  }
}

// ---- Platform CRUD ----

export interface PlatformRow {
  id: number;
  type: string;
  name: string;
  base_url: string | null;
  session_cookies: string | null;
  created_at: string;
}

export async function getPlatforms(): Promise<PlatformRow[]> {
  const d = await getDb();
  return d.select("SELECT * FROM platforms ORDER BY id");
}

export async function addPlatform(
  type: string,
  name: string,
  baseUrl: string | null
): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    "INSERT INTO platforms (type, name, base_url) VALUES ($1, $2, $3)",
    [type, name, baseUrl]
  );
  return result.lastInsertId!;
}

export async function updatePlatformCookies(
  id: number,
  cookies: string
): Promise<void> {
  const d = await getDb();
  await d.execute("UPDATE platforms SET session_cookies = $1 WHERE id = $2", [
    cookies,
    id,
  ]);
}

export async function deletePlatform(id: number): Promise<void> {
  const d = await getDb();
  await d.execute(
    "DELETE FROM assignments WHERE course_id IN (SELECT id FROM courses WHERE platform_id = $1)",
    [id]
  );
  await d.execute("DELETE FROM courses WHERE platform_id = $1", [id]);
  await d.execute("DELETE FROM platforms WHERE id = $1", [id]);
}

// ---- Course CRUD ----

export interface CourseRow {
  id: number;
  platform_id: number;
  external_id: string | null;
  name: string;
  color: string | null;
}

export async function getCourses(): Promise<CourseRow[]> {
  const d = await getDb();
  return d.select("SELECT * FROM courses ORDER BY name");
}

export async function upsertCourse(
  platformId: number,
  externalId: string,
  name: string
): Promise<number> {
  const d = await getDb();
  // Try to find existing
  const existing = await d.select<CourseRow[]>(
    "SELECT id FROM courses WHERE platform_id = $1 AND external_id = $2",
    [platformId, externalId]
  );
  if (existing.length > 0) {
    await d.execute(
      "UPDATE courses SET name = $1 WHERE id = $2",
      [name, existing[0].id]
    );
    return existing[0].id;
  }
  const result = await d.execute(
    "INSERT INTO courses (platform_id, external_id, name) VALUES ($1, $2, $3)",
    [platformId, externalId, name]
  );
  return result.lastInsertId!;
}

export async function addManualCourse(
  platformId: number,
  name: string
): Promise<number> {
  const d = await getDb();
  const existing = await d.select<CourseRow[]>(
    "SELECT id FROM courses WHERE platform_id = $1 AND name = $2",
    [platformId, name]
  );
  if (existing.length > 0) return existing[0].id;
  const result = await d.execute(
    "INSERT INTO courses (platform_id, name) VALUES ($1, $2)",
    [platformId, name]
  );
  return result.lastInsertId!;
}

export async function deleteCourse(id: number): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM assignments WHERE course_id = $1", [id]);
  await d.execute("DELETE FROM courses WHERE id = $1", [id]);
}

// ---- Assignment CRUD ----

export interface AssignmentRow {
  id: number;
  course_id: number;
  external_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  platform_url: string | null;
  is_completed: number;
  completed_at: string | null;
  is_manual: number;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithCourse extends AssignmentRow {
  course_name: string;
  course_color: string | null;
  platform_type: string;
}

export async function getAssignments(): Promise<AssignmentWithCourse[]> {
  const d = await getDb();
  return d.select(`
    SELECT a.*, c.name as course_name, c.color as course_color, p.type as platform_type
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN platforms p ON c.platform_id = p.id
    ORDER BY
      a.is_completed ASC,
      a.is_pinned DESC,
      CASE WHEN a.due_at IS NULL THEN 1 ELSE 0 END,
      a.due_at ASC
  `);
}

export async function addAssignment(
  courseId: number,
  title: string,
  dueAt: string | null,
  description: string | null,
  isManual: boolean
): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    `INSERT INTO assignments (course_id, title, due_at, description, is_manual)
     VALUES ($1, $2, $3, $4, $5)`,
    [courseId, title, dueAt, description, isManual ? 1 : 0]
  );
  return result.lastInsertId!;
}

export async function upsertAssignment(
  courseId: number,
  externalId: string,
  title: string,
  dueAt: string | null,
  description: string | null,
  platformUrl: string | null
): Promise<void> {
  const d = await getDb();
  const existing = await d.select<AssignmentRow[]>(
    "SELECT id FROM assignments WHERE course_id = $1 AND external_id = $2",
    [courseId, externalId]
  );
  if (existing.length > 0) {
    await d.execute(
      `UPDATE assignments
       SET title = $1, due_at = $2, description = $3, platform_url = $4, updated_at = datetime('now')
       WHERE id = $5`,
      [title, dueAt, description, platformUrl, existing[0].id]
    );
  } else {
    await d.execute(
      `INSERT INTO assignments (course_id, external_id, title, due_at, description, platform_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [courseId, externalId, title, dueAt, description, platformUrl]
    );
  }
}

export async function toggleAssignmentComplete(id: number): Promise<void> {
  const d = await getDb();
  const rows = await d.select<AssignmentRow[]>(
    "SELECT is_completed FROM assignments WHERE id = $1",
    [id]
  );
  if (rows.length === 0) return;
  const newStatus = rows[0].is_completed ? 0 : 1;
  await d.execute(
    `UPDATE assignments
     SET is_completed = $1, completed_at = CASE WHEN $1 = 1 THEN datetime('now') ELSE NULL END, updated_at = datetime('now')
     WHERE id = $2`,
    [newStatus, id]
  );
}

export async function deleteAssignment(id: number): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM assignments WHERE id = $1", [id]);
}

export async function togglePinAssignment(id: number): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE assignments SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = $1",
    [id]
  );
}

// ---- Notification Settings ----

export interface NotificationSettingRow {
  id: number;
  hours_before: number;
  enabled: number;
}

export async function getNotificationSettings(): Promise<
  NotificationSettingRow[]
> {
  const d = await getDb();
  return d.select(
    "SELECT * FROM notification_settings ORDER BY hours_before DESC"
  );
}

export async function toggleNotificationSetting(id: number): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE notification_settings SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = $1",
    [id]
  );
}

export async function addNotificationSetting(
  hoursBefore: number
): Promise<void> {
  const d = await getDb();
  // Ignore if already exists
  await d.execute(
    "INSERT OR IGNORE INTO notification_settings (hours_before, enabled) VALUES ($1, 1)",
    [hoursBefore]
  );
}

export async function deleteNotificationSetting(id: number): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM notification_settings WHERE id = $1", [id]);
}
