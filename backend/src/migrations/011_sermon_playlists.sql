CREATE TABLE IF NOT EXISTS sermon_playlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sermon_playlist_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id      UUID NOT NULL REFERENCES sermon_playlists(id) ON DELETE CASCADE,
  sermon_id        UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  order_index      INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
