-- Run in Supabase SQL Editor
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_read_later boolean default false;
NOTIFY pgrst, 'reload schema';
