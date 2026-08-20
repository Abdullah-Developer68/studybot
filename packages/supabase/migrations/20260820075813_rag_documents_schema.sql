set local check_function_bodies = off;

create extension "vector" schema "extensions";

create table "public"."document_chunks" (
  "chunk_id"    uuid                     not null default gen_random_uuid(),
  "document_id" uuid                     not null,
  "chunk_index" integer                  not null,
  "content"     text                     not null,
  "metadata"    jsonb                    default '{}'::jsonb,
  "embedding"   extensions.vector(768),
  "created_at"  timestamp with time zone not null default now(),
  constraint "document_chunks_pkey" primary key (chunk_id)
);

alter table "public"."document_chunks"
  enable row level security;

alter table "public"."documents"
  add column "session_id" uuid;

alter table "public"."documents"
  add column "chunk_count" integer not null default 0;

create or replace function public.match_document_chunks (
  p_session_id      uuid,
  p_query_embedding extensions.vector,
  p_match_count     integer           default 8
)
  returns table (
    content       text,
    metadata      jsonb,
    similarity    double precision,
    document_name text,
    document_id   uuid
  )
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
  AS $function$
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
$function$;

alter table "public"."document_chunks"
  add constraint "document_chunks_document_id_fkey" foreign key (document_id) references public.documents(document_id) on delete cascade;

alter table "public"."documents"
  add constraint "documents_session_id_fkey" foreign key (session_id) references public.chat_sessions(session_id) on delete set null;

create index idx_document_chunks_document_id on public.document_chunks using btree (document_id, chunk_index);

create index idx_document_chunks_embedding on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

create index idx_documents_session_id on public.documents using btree (session_id);

create policy "document_chunks_delete_own" on "public"."document_chunks"
  for delete
  to "authenticated"
  using ((document_id in ( select documents.document_id
   from public.documents
  where (documents.profile_id = auth.uid()))));

create policy "document_chunks_insert_own" on "public"."document_chunks"
  for insert
  to "authenticated"
  with check ((document_id IN ( SELECT documents.document_id
   FROM public.documents
  WHERE (documents.profile_id = auth.uid()))));

create policy "document_chunks_read_own" on "public"."document_chunks"
  for select
  to "authenticated"
  using ((document_id in ( select documents.document_id
   from public.documents
  where (documents.profile_id = auth.uid()))));

comment on extension "vector" is 'vector data type and ivfflat and hnsw access methods';

grant execute on function "public"."match_document_chunks"(uuid, extensions.vector, integer) to public, "postgres";

grant maintain, references, trigger, truncate on table "public"."document_chunks" to "anon", "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."document_chunks" to "postgres";

grant maintain, references, trigger, truncate on table "public"."document_chunks" to "service_role";
