-- ============================================
-- 2. DOCUMENTS (uploaded files)
-- ============================================

CREATE TABLE public.documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT NOT NULL,
  storage_path TEXT, -- Supabase Storage path
  extracted_text TEXT, -- parsed content
  was_truncated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);