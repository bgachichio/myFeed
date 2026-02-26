-- Migration v4: User profiles and settings
-- Run in Supabase SQL Editor

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  font_id text default 'inter',
  date_format text default 'relative',
  time_format text default '12h',
  timezone text default 'Africa/Nairobi',
  compact_mode boolean default false,
  show_reading_time boolean default true,
  show_author boolean default true,
  articles_per_page integer default 20,
  email_notifications boolean default false,
  updated_at timestamptz default now()
);

-- 2. RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing users
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
