-- ============================================
-- 5. CHAT SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  model TEXT DEFAULT 'gemini-2.0-flash', -- AI model used
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient thread retrieval by user
CREATE INDEX IF NOT EXISTS idx_chat_sessions_profile_id
ON public.chat_sessions(profile_id, updated_at DESC);

-- Create index for archived status filtering
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived
ON public.chat_sessions(profile_id, is_archived, updated_at DESC);
