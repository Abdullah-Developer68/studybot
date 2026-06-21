-- Chat Sessions RLS Policies

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own chat sessions
CREATE POLICY "chat_sessions_read_own"
ON public.chat_sessions FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- Users can insert their own chat sessions
CREATE POLICY "chat_sessions_insert_own"
ON public.chat_sessions FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own chat sessions
CREATE POLICY "chat_sessions_update_own"
ON public.chat_sessions FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Users can delete their own chat sessions
CREATE POLICY "chat_sessions_delete_own"
ON public.chat_sessions FOR DELETE TO authenticated
USING (profile_id = auth.uid());
