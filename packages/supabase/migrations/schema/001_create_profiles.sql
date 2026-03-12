-- ============================================
-- 1. PROFILES (extends Supabase Auth)
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