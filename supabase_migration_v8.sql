-- Migration v8: Add all missing columns to profiles table + fix all RLS policies
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Fully idempotent — safe to run multiple times.

-- ── STEP 1: Ensure profiles table exists (bare minimum) ───────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users(id) on delete cascade primary key
);

-- ── STEP 2: Add every settings column individually ────────────────
-- Uses ADD COLUMN IF NOT EXISTS so running twice is safe.
-- This is the fix for "column does not exist" — CREATE TABLE IF NOT EXISTS
-- skips the whole statement if the table already exists, never adding columns.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name       text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS font_id            text        DEFAULT 'inter';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_format        text        DEFAULT 'relative';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS time_format        text        DEFAULT '12h';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone           text        DEFAULT 'Africa/Nairobi';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS compact_mode       boolean     DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_reading_time  boolean     DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_author        boolean     DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS articles_per_page  integer     DEFAULT 20;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean    DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- ── STEP 3: Enable RLS ────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ── STEP 4: Fix profiles RLS policies ────────────────────────────
DROP POLICY IF EXISTS "Users can view their own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── STEP 5: Fix feeds RLS (FOR ALL USING blocks INSERT) ───────────
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can select their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can insert their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can update their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can delete their own feeds"  ON feeds;

CREATE POLICY "Users can select their own feeds"
  ON feeds FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feeds"
  ON feeds FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeds"
  ON feeds FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeds"
  ON feeds FOR DELETE USING (auth.uid() = user_id);

-- ── STEP 6: Fix articles RLS ──────────────────────────────────────
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can select their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can insert their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can update their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can delete their own articles"  ON articles;

CREATE POLICY "Users can select their own articles"
  ON articles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own articles"
  ON articles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles"
  ON articles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles"
  ON articles FOR DELETE USING (auth.uid() = user_id);

-- ── STEP 7: Fix folders RLS ───────────────────────────────────────
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can select their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can insert their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can update their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders"  ON folders;

CREATE POLICY "Users can select their own folders"
  ON folders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
  ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE USING (auth.uid() = user_id);

-- ── STEP 8: Ensure trigger creates full profile row on signup ─────
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

-- ── STEP 9: Backfill — ensure every user has a profile row ────────
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── Done ──────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
