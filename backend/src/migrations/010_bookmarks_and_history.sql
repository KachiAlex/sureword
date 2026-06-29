-- Sermon bookmarks (saved sermons per user)
CREATE TABLE IF NOT EXISTS sermon_bookmarks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL,
  sermon_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, sermon_id)
);

-- Listening history (per user, one row per play, keep latest timestamp)
CREATE TABLE IF NOT EXISTS listening_history (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL,
  sermon_id   TEXT NOT NULL,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress    INTEGER DEFAULT 0,
  UNIQUE(user_id, sermon_id)
);
