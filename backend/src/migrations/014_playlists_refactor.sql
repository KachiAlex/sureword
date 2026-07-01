CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  repeat_mode TEXT DEFAULT 'none',
  shuffle BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('sermon', 'music')),
  content_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radio_schedules (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radio_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  schedule_id TEXT,
  current_item_id TEXT,
  offset_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO playlists (id, title, description, created_at)
SELECT id, title, description, created_at FROM sermon_playlists
ON CONFLICT (id) DO NOTHING;

INSERT INTO radio_schedules (id, playlist_id, start_time, end_time, is_active, created_at)
SELECT id, id, start_time, end_time, is_active, created_at FROM sermon_playlists
ON CONFLICT (id) DO NOTHING;

INSERT INTO playlist_items (id, playlist_id, content_type, content_id, order_index, duration_minutes, created_at)
SELECT id, playlist_id, 'sermon', sermon_id, order_index, duration_minutes, created_at FROM sermon_playlist_items
ON CONFLICT (id) DO NOTHING;
