CREATE TABLE IF NOT EXISTS sermon_playlists (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sermon_playlist_items (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  playlist_id      TEXT NOT NULL REFERENCES sermon_playlists(id) ON DELETE CASCADE,
  sermon_id        TEXT NOT NULL,
  order_index      INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
