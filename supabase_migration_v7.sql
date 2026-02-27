-- Migration v7: Fix RLS INSERT policies on feeds, articles, and profiles
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- This is safe to run multiple times (idempotent).

-- ── FEEDS ─────────────────────────────────────────────────────────
-- The original "FOR ALL ... USING" policy blocks INSERT (USING doesn't apply to INSERT).
-- We replace it with explicit per-operation policies that include WITH CHECK for INSERT.

DROP POLICY IF EXISTS "Users can manage their own feeds" ON feeds;
DROP POLICY IF EXISTS "Users can select their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can insert their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can update their own feeds"  ON feeds;
DROP POLICY IF EXISTS "Users can delete their own feeds"  ON feeds;

CREATE POLICY "Users can select their own feeds"
  ON feeds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feeds"
  ON feeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeds"
  ON feeds FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeds"
  ON feeds FOR DELETE
  USING (auth.uid() = user_id);

-- ── ARTICLES ──────────────────────────────────────────────────────
-- Same fix: split "FOR ALL ... USING" into per-operation policies.

DROP POLICY IF EXISTS "Users can manage their own articles" ON articles;
DROP POLICY IF EXISTS "Users can select their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can insert their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can update their own articles"  ON articles;
DROP POLICY IF EXISTS "Users can delete their own articles"  ON articles;

CREATE POLICY "Users can select their own articles"
  ON articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own articles"
  ON articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles"
  ON articles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles"
  ON articles FOR DELETE
  USING (auth.uid() = user_id);

-- ── PROFILES ──────────────────────────────────────────────────────
-- v6 already split these correctly, but re-apply to be safe.

DROP POLICY IF EXISTS "Users can view their own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── FOLDERS ───────────────────────────────────────────────────────
-- Fix folders too (same pattern from v3 migration).

DROP POLICY IF EXISTS "Users can manage their own folders" ON folders;
DROP POLICY IF EXISTS "Users can select their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can insert their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can update their own folders"  ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders"  ON folders;

CREATE POLICY "Users can select their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- ── Backfill profile rows for any users who don't have one ────────
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── Reload PostgREST schema cache ─────────────────────────────────
NOTIFY pgrst, 'reload schema';
