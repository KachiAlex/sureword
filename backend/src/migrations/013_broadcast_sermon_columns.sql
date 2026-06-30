-- Add sermon broadcast columns to broadcasts table
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'live';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS playlist_id TEXT;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS current_sermon_id TEXT;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS current_sermon_offset_seconds INTEGER DEFAULT 0;
