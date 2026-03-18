import * as SQLite from "expo-sqlite";

const DB_NAME = "fitaly.db";

let db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync(`PRAGMA journal_mode = WAL;`);
    db.execSync(`PRAGMA foreign_keys = ON;`);
  }
  return db;
}

function getUserVersion(d: SQLite.SQLiteDatabase): number {
  const row = d.getFirstSync<{ user_version: number }>(
    `PRAGMA user_version`
  ) as { user_version: number } | undefined;
  return row?.user_version ?? 0;
}
function setUserVersion(d: SQLite.SQLiteDatabase, v: number) {
  d.execSync(`PRAGMA user_version = ${v};`);
}
function columnExists(
  d: SQLite.SQLiteDatabase,
  table: string,
  column: string
): boolean {
  try {
    const rows = d.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
    return Array.isArray(rows)
      ? rows.some((r) => String(r.name).toLowerCase() === column.toLowerCase())
      : false;
  } catch {
    return false;
  }
}

/**
 * Run migrations on app start.
 * Call once in App.tsx before using any repos.
 */
export function runMigrations() {
  const d = getDB();
  let v = getUserVersion(d);

  // v0 → v1: initial schema
  if (v < 1) {
    d.execSync("BEGIN");
    try {
      d.execSync(`
        CREATE TABLE IF NOT EXISTS meals (
          cloud_id TEXT PRIMARY KEY,
          meal_id TEXT NOT NULL,
          user_uid TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          name TEXT,
          ingredients TEXT,
          photo_url TEXT,
          image_local TEXT,
          image_id TEXT,
          totals_kcal REAL DEFAULT 0,
          totals_protein REAL DEFAULT 0,
          totals_carbs REAL DEFAULT 0,
          totals_fat REAL DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_synced_at INTEGER NOT NULL DEFAULT 0,
          sync_state TEXT NOT NULL DEFAULT 'pending',
          source TEXT,
          notes TEXT,
          tags TEXT
        );
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_meals_user_ts
          ON meals(user_uid, timestamp DESC);
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_meals_user_del_ts
          ON meals(user_uid, deleted, timestamp DESC);
      `);
      d.execSync(`
        CREATE TABLE IF NOT EXISTS op_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cloud_id TEXT NOT NULL,
          user_uid TEXT NOT NULL,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          attempts INTEGER DEFAULT 0
        );
      `);
      d.execSync(`
        CREATE TABLE IF NOT EXISTS op_queue_dead (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          op_id INTEGER NOT NULL,
          cloud_id TEXT NOT NULL,
          user_uid TEXT NOT NULL,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          attempts INTEGER NOT NULL,
          failed_at TEXT NOT NULL,
          last_error_code TEXT,
          last_error_message TEXT
        );
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_op_queue_dead_user_failed
          ON op_queue_dead(user_uid, failed_at DESC);
      `);
      d.execSync(`
        CREATE TABLE IF NOT EXISTS images (
          image_id TEXT PRIMARY KEY,
          user_uid TEXT NOT NULL,
          local_path TEXT NOT NULL,
          cloud_url TEXT,
          status TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      setUserVersion(d, 1);
      d.execSync("COMMIT");
      v = 1;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  // v1 → v2: ensure indices exist
  if (v < 2) {
    d.execSync("BEGIN");
    try {
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_meals_user_del_ts
          ON meals(user_uid, deleted, timestamp DESC);
      `);
      if (!columnExists(d, "meals", "notes")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN notes TEXT;`);
      }
      if (!columnExists(d, "meals", "image_id")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN image_id TEXT;`);
      }
      if (!columnExists(d, "meals", "created_at")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN created_at TEXT;`);
        d.execSync(`
          UPDATE meals
          SET created_at = COALESCE(
            NULLIF(created_at, ''),
            NULLIF(timestamp, ''),
            NULLIF(updated_at, ''),
            datetime('now')
          )
          WHERE created_at IS NULL OR created_at='';
        `);
      }
      setUserVersion(d, 2);
      d.execSync("COMMIT");
      v = 2;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  if (v < 3) {
    d.execSync("BEGIN");
    try {
      d.execSync(`
        CREATE TABLE IF NOT EXISTS chat_threads (
          id TEXT PRIMARY KEY,
          user_uid TEXT NOT NULL,
          title TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_message TEXT,
          last_message_at INTEGER
        );
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated
          ON chat_threads(user_uid, updated_at DESC);
      `);
      d.execSync(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          user_uid TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          last_synced_at INTEGER NOT NULL,
          sync_state TEXT NOT NULL DEFAULT 'synced',
          deleted INTEGER NOT NULL DEFAULT 0
        );
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
          ON chat_messages(user_uid, thread_id, created_at DESC);
      `);
      setUserVersion(d, 3);
      d.execSync("COMMIT");
      v = 3;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  if (v < 4) {
    d.execSync("BEGIN");
    try {
      d.execSync(`
        CREATE TABLE IF NOT EXISTS my_meals (
          cloud_id TEXT PRIMARY KEY,
          meal_id TEXT NOT NULL,
          user_uid TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          name TEXT,
          ingredients TEXT,
          photo_url TEXT,
          image_local TEXT,
          image_id TEXT,
          totals_kcal REAL DEFAULT 0,
          totals_protein REAL DEFAULT 0,
          totals_carbs REAL DEFAULT 0,
          totals_fat REAL DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_synced_at INTEGER NOT NULL DEFAULT 0,
          sync_state TEXT NOT NULL DEFAULT 'pending',
          source TEXT,
          notes TEXT,
          tags TEXT
        );
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_my_meals_user_name
          ON my_meals(user_uid, name COLLATE NOCASE ASC, cloud_id ASC);
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_my_meals_user_updated
          ON my_meals(user_uid, updated_at ASC, cloud_id ASC);
      `);
      setUserVersion(d, 4);
      d.execSync("COMMIT");
      v = 4;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  if (v < 5) {
    d.execSync("BEGIN");
    try {
      if (!columnExists(d, "meals", "ingredients")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN ingredients TEXT;`);
      }
      d.execSync(`
        UPDATE meals
        SET ingredients = COALESCE(ingredients, '[]')
        WHERE ingredients IS NULL;
      `);
      if (!columnExists(d, "my_meals", "ingredients")) {
        d.execSync(`ALTER TABLE my_meals ADD COLUMN ingredients TEXT;`);
      }
      d.execSync(`
        UPDATE my_meals
        SET ingredients = COALESCE(ingredients, '[]')
        WHERE ingredients IS NULL;
      `);
      setUserVersion(d, 5);
      d.execSync("COMMIT");
      v = 5;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  if (v < 6) {
    d.execSync("BEGIN");
    try {
      d.execSync(`
        CREATE TABLE IF NOT EXISTS op_queue_dead (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          op_id INTEGER NOT NULL,
          cloud_id TEXT NOT NULL,
          user_uid TEXT NOT NULL,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          attempts INTEGER NOT NULL,
          failed_at TEXT NOT NULL,
          last_error_code TEXT,
          last_error_message TEXT
        );
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_op_queue_dead_user_failed
          ON op_queue_dead(user_uid, failed_at DESC);
      `);
      setUserVersion(d, 6);
      d.execSync("COMMIT");
      v = 6;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  if (v < 7) {
    d.execSync("BEGIN");
    try {
      if (!columnExists(d, "meals", "last_synced_at")) {
        d.execSync(
          `ALTER TABLE meals ADD COLUMN last_synced_at INTEGER NOT NULL DEFAULT 0;`
        );
      }
      if (!columnExists(d, "meals", "sync_state")) {
        d.execSync(
          `ALTER TABLE meals ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'pending';`
        );
      }
      if (!columnExists(d, "my_meals", "last_synced_at")) {
        d.execSync(
          `ALTER TABLE my_meals ADD COLUMN last_synced_at INTEGER NOT NULL DEFAULT 0;`
        );
      }
      if (!columnExists(d, "my_meals", "sync_state")) {
        d.execSync(
          `ALTER TABLE my_meals ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'pending';`
        );
      }

      d.execSync(`
        UPDATE meals
        SET sync_state = 'failed'
        WHERE EXISTS (
          SELECT 1
          FROM op_queue_dead qd
          WHERE qd.user_uid = meals.user_uid
            AND qd.cloud_id = meals.cloud_id
            AND qd.kind IN ('upsert', 'delete')
        );
      `);
      d.execSync(`
        UPDATE meals
        SET sync_state = 'pending'
        WHERE sync_state != 'failed'
          AND EXISTS (
            SELECT 1
            FROM op_queue q
            WHERE q.user_uid = meals.user_uid
              AND q.cloud_id = meals.cloud_id
              AND q.kind IN ('upsert', 'delete')
          );
      `);
      d.execSync(`
        UPDATE meals
        SET sync_state = 'synced'
        WHERE sync_state NOT IN ('pending', 'failed', 'conflict', 'synced');
      `);
      d.execSync(`
        UPDATE meals
        SET last_synced_at = CASE
          WHEN sync_state = 'synced'
               AND (last_synced_at IS NULL OR last_synced_at = 0)
            THEN COALESCE(CAST(strftime('%s', updated_at) AS INTEGER) * 1000, 0)
          ELSE COALESCE(last_synced_at, 0)
        END;
      `);

      d.execSync(`
        UPDATE my_meals
        SET sync_state = 'failed'
        WHERE EXISTS (
          SELECT 1
          FROM op_queue_dead qd
          WHERE qd.user_uid = my_meals.user_uid
            AND qd.cloud_id = my_meals.cloud_id
            AND qd.kind IN ('upsert_mymeal', 'delete_mymeal')
        );
      `);
      d.execSync(`
        UPDATE my_meals
        SET sync_state = 'pending'
        WHERE sync_state != 'failed'
          AND EXISTS (
            SELECT 1
            FROM op_queue q
            WHERE q.user_uid = my_meals.user_uid
              AND q.cloud_id = my_meals.cloud_id
              AND q.kind IN ('upsert_mymeal', 'delete_mymeal')
          );
      `);
      d.execSync(`
        UPDATE my_meals
        SET sync_state = 'synced'
        WHERE sync_state NOT IN ('pending', 'failed', 'conflict', 'synced');
      `);
      d.execSync(`
        UPDATE my_meals
        SET last_synced_at = CASE
          WHEN sync_state = 'synced'
               AND (last_synced_at IS NULL OR last_synced_at = 0)
            THEN COALESCE(CAST(strftime('%s', updated_at) AS INTEGER) * 1000, 0)
          ELSE COALESCE(last_synced_at, 0)
        END;
      `);

      setUserVersion(d, 7);
      d.execSync("COMMIT");
      v = 7;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }

  if (v < 8) {
    d.execSync("BEGIN");
    try {
      if (!columnExists(d, "meals", "input_method")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN input_method TEXT;`);
      }
      if (!columnExists(d, "meals", "ai_meta")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN ai_meta TEXT;`);
      }
      if (!columnExists(d, "my_meals", "input_method")) {
        d.execSync(`ALTER TABLE my_meals ADD COLUMN input_method TEXT;`);
      }
      if (!columnExists(d, "my_meals", "ai_meta")) {
        d.execSync(`ALTER TABLE my_meals ADD COLUMN ai_meta TEXT;`);
      }

      setUserVersion(d, 8);
      d.execSync("COMMIT");
      v = 8;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }
}

export function resetOfflineStorage() {
  const d = getDB();
  d.execSync("BEGIN");
  try {
    d.execSync(`DELETE FROM op_queue;`);
    d.execSync(`DELETE FROM op_queue_dead;`);
    d.execSync(`DELETE FROM images;`);
    d.execSync(`DELETE FROM meals;`);
    d.execSync(`DELETE FROM my_meals;`);
    d.execSync(`DELETE FROM chat_messages;`);
    d.execSync(`DELETE FROM chat_threads;`);
    d.execSync("COMMIT");
  } catch (error) {
    d.execSync("ROLLBACK");
    throw error;
  }
}
