-- ============================================
-- ASSIGNMENTS (main work items)
-- ============================================

CREATE TABLE IF NOT EXISTS public.assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(template_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- TipTap editor JSON (current state)
  original_content TEXT, -- AI-generated raw text
  humanized_content TEXT, -- final humanized text
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'humanized', 'exported')),
  detection_score DECIMAL(5,2), -- 0.00 to 100.00
  humanization_passes INTEGER DEFAULT 0, -- number of iterations
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Base table privileges required before RLS policies are evaluated.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;

-- Users can read their own assignments.
CREATE POLICY "assignments_read_own"
ON public.assignments FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- Users can insert their own assignments.
CREATE POLICY "assignments_insert_own"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own assignments.
CREATE POLICY "assignments_update_own"
ON public.assignments FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Users can delete their own assignments.
CREATE POLICY "assignments_delete_own"
ON public.assignments FOR DELETE TO authenticated
USING (profile_id = auth.uid());
