-- Run in Supabase SQL Editor
-- Migration v3: Feed health visibility + Folder organisation

-- 1. Feed health columns
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz;
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS error_count integer default 0;
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS article_count integer default 0;

-- 2. Folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  position integer default 0,
  created_at timestamptz default now()
);

-- 3. Add folder_id to feeds
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS folder_id uuid references folders(id) on delete set null;

-- 4. RLS for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own folders"
  ON folders FOR ALL
  USING (auth.uid() = user_id);

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS articles_user_pub_date ON articles(user_id, pub_date DESC);
CREATE INDEX IF NOT EXISTS feeds_folder_id ON feeds(folder_id);

NOTIFY pgrst, 'reload schema';
