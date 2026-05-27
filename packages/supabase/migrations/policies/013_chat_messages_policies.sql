-- Chat Messages RLS Policies
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--1) Owners can read their own chat Messages
CREATE POLICY "chat_messages_read_own"
ON public.templates FOR SELECT TO authenticated
USING (profile_id = auth.uid());
