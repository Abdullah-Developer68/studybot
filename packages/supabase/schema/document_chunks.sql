-- ============================================
-- DOCUMENT CHUNKS (RAG embeddings)
-- ============================================

-- pgvector for embedding storage + similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.document_chunks (
  chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- { source, page?/sheet?, chunkIndex, totalChunks }
  embedding extensions.vector(1536), -- openai/text-embedding-3-small (via OpenRouter)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup of all chunks for one document in ingestion order
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
ON public.document_chunks(document_id, chunk_index);

-- Approximate nearest-neighbour search over cosine distance
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON public.document_chunks USING hnsw (embedding extensions.vector_cosine_ops);

-- ============================================
-- SIMILARITY SEARCH RPC
-- ============================================

-- Returns the top-matching chunks for a chat session. SECURITY DEFINER so it
-- can read chunks regardless of RLS, with the internal
-- d.profile_id = auth.uid() guard preserving per-user isolation.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_session_id UUID,
  p_query_embedding extensions.vector(1536),
  p_match_count INT DEFAULT 8
)
RETURNS TABLE (
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  document_name TEXT,
  document_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.content,
    dc.metadata,
    (1 - (dc.embedding <=> p_query_embedding))::FLOAT AS similarity,
    d.name AS document_name,
    d.document_id
  FROM public.document_chunks dc
  JOIN public.documents d ON d.document_id = dc.document_id
  WHERE d.session_id = p_session_id
    AND d.profile_id = auth.uid()
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> p_query_embedding ASC
  LIMIT p_match_count;
END;
$$;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Users can read chunks of their own documents.
CREATE POLICY "document_chunks_read_own"
ON public.document_chunks FOR SELECT TO authenticated
USING (
  document_id IN (
    SELECT document_id FROM public.documents
    WHERE profile_id = auth.uid()
  )
);

-- Users can insert chunks for their own documents.
CREATE POLICY "document_chunks_insert_own"
ON public.document_chunks FOR INSERT TO authenticated
WITH CHECK (
  document_id IN (
    SELECT document_id FROM public.documents
    WHERE profile_id = auth.uid()
  )
);

-- Users can delete chunks of their own documents.
CREATE POLICY "document_chunks_delete_own"
ON public.document_chunks FOR DELETE TO authenticated
USING (
  document_id IN (
    SELECT document_id FROM public.documents
    WHERE profile_id = auth.uid()
  )
);
