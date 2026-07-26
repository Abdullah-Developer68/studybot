-- ============================================
-- CHAT MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  /* attachments structure:
  [
    { "document_id": "uuid", "name": "file.pdf", "type": "application/pdf" }
  ]
  */
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient message retrieval by session (ordered by creation time)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
ON public.chat_messages(session_id, created_at ASC);

-- Index for sorting messages by creation time
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
ON public.chat_messages(created_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages from their own sessions.
CREATE POLICY "chat_messages_read_own"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  session_id IN (
    SELECT session_id FROM public.chat_sessions
    WHERE profile_id = auth.uid()
  )
);

-- Users can insert messages to their own sessions.
CREATE POLICY "chat_messages_insert_own"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  session_id IN (
    SELECT session_id FROM public.chat_sessions
    WHERE profile_id = auth.uid()
  )
);

-- Users can delete messages from their own sessions.
CREATE POLICY "chat_messages_delete_own"
ON public.chat_messages FOR DELETE TO authenticated
USING (
  session_id IN (
    SELECT session_id FROM public.chat_sessions
    WHERE profile_id = auth.uid()
  )
);
