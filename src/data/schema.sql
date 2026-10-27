PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS bookings_user_start_idx
  ON bookings(user_id, starts_at);

INSERT OR IGNORE INTO users (id, email)
VALUES ('demo-user', 'student@example.test');

INSERT OR IGNORE INTO bookings (id, user_id, lab_name, starts_at, ends_at, purpose)
VALUES
  ('booking-1', 'demo-user', 'Robotics Lab', '2026-10-28T09:00:00Z', '2026-10-28T10:00:00Z', 'Sensor calibration'),
  ('booking-2', 'demo-user', 'Electronics Lab', '2026-10-30T13:30:00Z', '2026-10-30T15:00:00Z', 'Circuit testing'),
  ('booking-3', 'demo-user', 'Robotics Lab', '2026-11-03T11:00:00Z', '2026-11-03T12:30:00Z', 'Project assembly');