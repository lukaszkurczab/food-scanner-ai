CREATE TABLE IF NOT EXISTS meals (
  cloud_id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL,
  user_uid TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  photo_local_path TEXT,
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
CREATE INDEX IF NOT EXISTS idx_meals_user_ts ON meals(user_uid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user_del_ts ON meals(user_uid, deleted, timestamp DESC);

CREATE TABLE IF NOT EXISTS op_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cloud_id TEXT NOT NULL,
  user_uid TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  attempts INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS images (
  image_id TEXT PRIMARY KEY,
  user_uid TEXT NOT NULL,
  local_path TEXT NOT NULL,
  cloud_url TEXT,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

PRAGMA user_version=2;