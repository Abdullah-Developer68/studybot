-- ============================================
--6. CHAT MESSAGES
-- ============================================

CREATE TABLE public.chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  /* attachments structure:
  [
    { "document_id": "uuid", "name": "file.pdf", "type": "application/pdf" }
  ]
  */
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
