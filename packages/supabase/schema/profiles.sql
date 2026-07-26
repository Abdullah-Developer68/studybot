-- ============================================
-- PROFILES (extends Supabase Auth)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  profile_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  profile_pic TEXT,
  payment_plan TEXT NOT NULL DEFAULT 'free' CHECK (payment_plan IN ('free', 'pro', 'enterprise')),
  usage_credits INTEGER NOT NULL DEFAULT 100, -- for humanization/detection API calls
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile row.
CREATE POLICY "profiles_read_own"
ON public.profiles FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- Users can insert their own profile row.
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own profile row.
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Users can delete their own profile row.
CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE TO authenticated
USING (profile_id = auth.uid());
