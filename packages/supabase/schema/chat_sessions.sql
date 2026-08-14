-- ============================================
-- CHAT SESSIONS
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

-- Index for efficient thread retrieval by user
CREATE INDEX IF NOT EXISTS idx_chat_sessions_profile_id
ON public.chat_sessions(profile_id, updated_at DESC);

-- Index for archived status filtering
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived
ON public.chat_sessions(profile_id, is_archived, updated_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Base table privileges required before RLS policies are evaluated.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;

-- Users can read their own chat sessions.
CREATE POLICY "chat_sessions_read_own"
ON public.chat_sessions FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- Users can insert their own chat sessions.
CREATE POLICY "chat_sessions_insert_own"
ON public.chat_sessions FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own chat sessions.
CREATE POLICY "chat_sessions_update_own"
ON public.chat_sessions FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Users can delete their own chat sessions.
CREATE POLICY "chat_sessions_delete_own"
ON public.chat_sessions FOR DELETE TO authenticated
USING (profile_id = auth.uid());
