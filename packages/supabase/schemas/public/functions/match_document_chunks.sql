create or replace function public.match_document_chunks(
  p_session_id uuid,
  p_query_embedding extensions.vector(768),
  p_match_count integer default 8
)
returns table (
  content text,
  metadata jsonb,
  similarity double precision,
  document_name text,
  document_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    dc.content,
    dc.metadata,
    (1 - (dc.embedding <=> p_query_embedding))::double precision as similarity,
    d.name as document_name,
    dc.document_id
  from public.document_chunks dc
  join public.documents d on d.document_id = dc.document_id
  where d.session_id = p_session_id
    and d.profile_id = auth.uid()
    and dc.embedding is not null
  order by dc.embedding <=> p_query_embedding asc
  limit p_match_count;
end;
$$;
