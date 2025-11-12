import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("caloriai.db");
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
    const rows = d.getAllSync<{ name: string }>(
      `PRAGMA table_info(${table})`
    ) as any[];
    return Array.isArray(rows)
      ? rows.some((r) => String(r.name).toLowerCase() === column.toLowerCase())
      : false;
  } catch {
    return false;
  }
}

export function runMigrations() {
  const d = getDB();
  let v = getUserVersion(d);

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
      if (!columnExists(d, "meals", "photo_local_path")) {
        d.execSync(`ALTER TABLE meals ADD COLUMN photo_local_path TEXT;`);
      }
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_meals_user_updated
          ON meals(user_uid, updated_at DESC);
      `);
      d.execSync(`
        CREATE INDEX IF NOT EXISTS idx_meals_cloud_id
          ON meals(cloud_id);
      `);
      setUserVersion(d, 3);
      d.execSync("COMMIT");
      v = 3;
    } catch (e) {
      d.execSync("ROLLBACK");
      throw e;
    }
  }
}
