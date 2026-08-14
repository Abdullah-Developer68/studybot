-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.profiles (
    profile_id,
    name,
    email,
    profile_pic,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'User'
    ),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NOW()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    profile_pic = EXCLUDED.profile_pic,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

CREATE TABLE public.assignments (
  assignment_id       uuid                     DEFAULT gen_random_uuid() NOT NULL,
  profile_id          uuid                     NOT NULL,
  template_id         uuid,
  title               text                     NOT NULL,
  content             jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  original_content    text,
  humanized_content   text,
  status              text                     DEFAULT 'draft'::text NOT NULL,
  detection_score     numeric(5,2),
  humanization_passes integer                  DEFAULT 0,
  created_at          timestamp with time zone DEFAULT now() NOT NULL,
  updated_at          timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.assignments
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_pkey PRIMARY KEY (assignment_id);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_status_check CHECK (status = ANY (ARRAY['draft'::text, 'processing'::text, 'humanized'::text, 'exported'::text]));

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.assignments TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.assignments TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.assignments TO service_role;

CREATE POLICY assignments_delete_own ON public.assignments
  FOR DELETE
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY assignments_insert_own ON public.assignments
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = auth.uid()));

CREATE POLICY assignments_read_own ON public.assignments
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY assignments_update_own ON public.assignments
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));

CREATE TABLE public.chat_messages (
  message_id  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  session_id  uuid                     NOT NULL,
  role        text                     NOT NULL,
  content     text                     NOT NULL,
  attachments jsonb                    DEFAULT '[]'::jsonb,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (message_id);

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_role_check CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text]));

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.chat_messages TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.chat_messages TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.chat_messages TO service_role;

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages (created_at DESC);

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages (session_id, created_at);

CREATE TABLE public.chat_sessions (
  session_id  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  profile_id  uuid                     NOT NULL,
  title       text                     DEFAULT 'New Chat'::text NOT NULL,
  model       text                     DEFAULT 'gemini-2.0-flash'::text,
  is_archived boolean                  DEFAULT false,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY chat_messages_delete_own ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING ((session_id IN ( SELECT chat_sessions.session_id
   FROM public.chat_sessions
  WHERE (chat_sessions.profile_id = auth.uid()))));

CREATE POLICY chat_messages_insert_own ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((session_id IN ( SELECT chat_sessions.session_id
   FROM public.chat_sessions
  WHERE (chat_sessions.profile_id = auth.uid()))));

CREATE POLICY chat_messages_read_own ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING ((session_id IN ( SELECT chat_sessions.session_id
   FROM public.chat_sessions
  WHERE (chat_sessions.profile_id = auth.uid()))));

ALTER TABLE public.chat_sessions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chat_sessions
  ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (session_id);

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.chat_sessions TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.chat_sessions TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.chat_sessions TO service_role;

CREATE INDEX idx_chat_sessions_profile_id ON public.chat_sessions (profile_id, updated_at DESC);

CREATE INDEX idx_chat_sessions_archived ON public.chat_sessions (profile_id, is_archived, updated_at DESC);

CREATE POLICY chat_sessions_delete_own ON public.chat_sessions
  FOR DELETE
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY chat_sessions_insert_own ON public.chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = auth.uid()));

CREATE POLICY chat_sessions_read_own ON public.chat_sessions
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY chat_sessions_update_own ON public.chat_sessions
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));

CREATE TABLE public.detection_results (
  detection_id      uuid                     DEFAULT gen_random_uuid() NOT NULL,
  assignment_id     uuid                     NOT NULL,
  overall_score     numeric(5,2)             NOT NULL,
  sentence_analysis jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  provider          text,
  created_at        timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.detection_results
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.detection_results
  ADD CONSTRAINT detection_results_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id) ON DELETE CASCADE;

ALTER TABLE public.detection_results
  ADD CONSTRAINT detection_results_pkey PRIMARY KEY (detection_id);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.detection_results TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.detection_results TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.detection_results TO service_role;

CREATE POLICY detection_results_delete_own ON public.detection_results
  FOR DELETE
  TO authenticated
  USING ((assignment_id IN ( SELECT assignments.assignment_id
   FROM public.assignments
  WHERE (assignments.profile_id = auth.uid()))));

CREATE POLICY detection_results_insert_own ON public.detection_results
  FOR INSERT
  TO authenticated
  WITH CHECK ((assignment_id IN ( SELECT assignments.assignment_id
   FROM public.assignments
  WHERE (assignments.profile_id = auth.uid()))));

CREATE POLICY detection_results_read_own ON public.detection_results
  FOR SELECT
  TO authenticated
  USING ((assignment_id IN ( SELECT assignments.assignment_id
   FROM public.assignments
  WHERE (assignments.profile_id = auth.uid()))));

CREATE TABLE public.documents (
  document_id    uuid                     DEFAULT gen_random_uuid() NOT NULL,
  profile_id     uuid                     NOT NULL,
  name           text                     NOT NULL,
  file_name      text                     NOT NULL,
  file_type      text                     NOT NULL,
  file_size      bigint                   NOT NULL,
  storage_path   text,
  extracted_text text,
  was_truncated  boolean                  DEFAULT false,
  created_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.documents
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_pkey PRIMARY KEY (document_id);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.documents TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.documents TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.documents TO service_role;

CREATE POLICY documents_delete_own ON public.documents
  FOR DELETE
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY documents_insert_own ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = auth.uid()));

CREATE POLICY documents_read_own ON public.documents
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY documents_update_own ON public.documents
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));

CREATE TABLE public.profiles (
  profile_id    uuid                     NOT NULL,
  name          text,
  email         text,
  profile_pic   text,
  payment_plan  text                     DEFAULT 'free'::text NOT NULL,
  usage_credits integer                  DEFAULT 100 NOT NULL,
  created_at    timestamp with time zone DEFAULT now() NOT NULL,
  updated_at    timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payment_plan_check CHECK (payment_plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text]));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (profile_id);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(profile_id) ON DELETE CASCADE;

ALTER TABLE public.chat_sessions
  ADD CONSTRAINT chat_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(profile_id) ON DELETE CASCADE;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(profile_id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO service_role;

CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = auth.uid()));

CREATE POLICY profiles_read_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));

CREATE TABLE public.templates (
  template_id uuid                     DEFAULT gen_random_uuid() NOT NULL,
  profile_id  uuid                     NOT NULL,
  name        text                     NOT NULL,
  description text,
  category    text,
  tags        text[],
  content     jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  is_public   boolean                  DEFAULT false NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.templates
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_pkey PRIMARY KEY (template_id);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(template_id) ON DELETE SET NULL;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(profile_id) ON DELETE CASCADE;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_profile_id_name_key UNIQUE (profile_id, name);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.templates TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.templates TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.templates TO service_role;

CREATE POLICY templates_delete_own ON public.templates
  FOR DELETE
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY templates_insert_own ON public.templates
  FOR INSERT
  TO authenticated
  WITH CHECK (((profile_id = auth.uid()) AND (is_public = false)));

CREATE POLICY templates_select_own ON public.templates
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()));

CREATE POLICY templates_update_own ON public.templates
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK (((profile_id = auth.uid()) AND (is_public = false)));