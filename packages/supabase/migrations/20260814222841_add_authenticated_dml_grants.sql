-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

GRANT DELETE, INSERT, SELECT, UPDATE ON public.assignments TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.chat_messages TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.chat_sessions TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.detection_results TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.documents TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.templates TO authenticated;