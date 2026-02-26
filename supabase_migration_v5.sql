-- Migration v5: Store full article content from RSS feeds
-- Run in Supabase SQL Editor

ALTER TABLE articles ADD COLUMN IF NOT EXISTS full_content text;

NOTIFY pgrst, 'reload schema';
