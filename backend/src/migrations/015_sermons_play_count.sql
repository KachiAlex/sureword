-- Add play_count to sermons table if it doesn't exist
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;
