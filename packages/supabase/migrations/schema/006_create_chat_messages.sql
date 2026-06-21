-- ============================================
-- 6. CHAT MESSAGES
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

-- Create index for efficient message retrieval by session (ordered by creation time)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
ON public.chat_messages(session_id, created_at ASC);

-- Create index for sorting messages by creation time
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
ON public.chat_messages(created_at DESC);
