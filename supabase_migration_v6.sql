-- Migration v6: Fix profiles RLS policies for settings persistence
-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste and run

-- Ensure profiles table exists (idempotent)
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies cleanly (IF NOT EXISTS is PG15+ only — this is safe for all versions)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert their own profile" ON profiles;

-- SELECT
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- INSERT
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Ensure every existing user has a profile row (safe backfill)
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Ensure trigger exists for new signups
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

NOTIFY pgrst, 'reload schema';
