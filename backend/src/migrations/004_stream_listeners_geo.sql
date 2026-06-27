-- Add geo columns to stream_listeners for analytics
ALTER TABLE stream_listeners ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE stream_listeners ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE stream_listeners ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE stream_listeners ADD COLUMN IF NOT EXISTS city TEXT;
