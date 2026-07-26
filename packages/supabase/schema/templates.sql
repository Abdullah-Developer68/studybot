-- ============================================
-- TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS public.templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'essay', 'report', 'research', 'lab_report', 'custom'
  tags TEXT[], -- array of tags for filtering
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- TipTap editor JSON
  is_public BOOLEAN NOT NULL DEFAULT false, -- allow sharing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, name)
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 1) Owners can read their own templates.
CREATE POLICY "templates_select_own"
ON public.templates FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- 2) Owners can insert only private templates.
CREATE POLICY "templates_insert_own"
ON public.templates FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND is_public = false
);

-- 3) Owners can update only their own private templates.
CREATE POLICY "templates_update_own"
ON public.templates FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (
  profile_id = auth.uid()
  AND is_public = false
);

-- 4) Owners can delete only their own templates.
CREATE POLICY "templates_delete_own"
ON public.templates FOR DELETE TO authenticated
USING (profile_id = auth.uid());
