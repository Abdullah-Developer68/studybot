-- ============================================
-- 3. TEMPLATES
-- ============================================

CREATE TABLE public.templates (
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