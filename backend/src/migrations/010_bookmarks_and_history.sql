-- Sermon bookmarks (saved sermons per user)
CREATE TABLE IF NOT EXISTS sermon_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sermon_id   UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, sermon_id)
);

-- Listening history (per user, one row per play, keep latest timestamp)
CREATE TABLE IF NOT EXISTS listening_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sermon_id   UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress    INTEGER DEFAULT 0,
  UNIQUE(user_id, sermon_id)
);
