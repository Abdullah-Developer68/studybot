-- Chat Messages RLS Policies

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages from their own sessions
CREATE POLICY "chat_messages_read_own"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  session_id IN (
    SELECT session_id FROM public.chat_sessions
    WHERE profile_id = auth.uid()
  )
);

-- Users can insert messages to their own sessions
CREATE POLICY "chat_messages_insert_own"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  session_id IN (
    SELECT session_id FROM public.chat_sessions
    WHERE profile_id = auth.uid()
  )
);

-- Users can delete messages from their own sessions
CREATE POLICY "chat_messages_delete_own"
ON public.chat_messages FOR DELETE TO authenticated
USING (
  session_id IN (
    SELECT session_id FROM public.chat_sessions
    WHERE profile_id = auth.uid()
  )
);
