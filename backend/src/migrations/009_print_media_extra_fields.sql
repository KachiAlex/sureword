-- Add page_count and published_date to print_media
ALTER TABLE print_media ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE print_media ADD COLUMN IF NOT EXISTS published_date DATE;
