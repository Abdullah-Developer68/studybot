-- ============================================
-- 4. ASSIGNMENTS (main work items)
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