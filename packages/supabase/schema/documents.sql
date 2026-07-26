-- ============================================
-- DOCUMENTS (uploaded files)
-- ============================================

CREATE TABLE IF NOT EXISTS public.documents (
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

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Users can read their own documents.
CREATE POLICY "documents_read_own"
ON public.documents FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- Users can insert their own documents.
CREATE POLICY "documents_insert_own"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Users can update their own documents.
CREATE POLICY "documents_update_own"
ON public.documents FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Users can delete their own documents.
CREATE POLICY "documents_delete_own"
ON public.documents FOR DELETE TO authenticated
USING (profile_id = auth.uid());
