-- Add recorded_at column to broadcasts for recording timestamp
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP;
