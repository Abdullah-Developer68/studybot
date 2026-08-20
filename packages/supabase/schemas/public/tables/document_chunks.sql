create table "public"."document_chunks" (
  "chunk_id" uuid not null default gen_random_uuid(),
  "document_id" uuid not null,
  "chunk_index" integer not null,
  "content" text not null,
  "metadata" jsonb default '{}'::jsonb,
  "embedding" extensions.vector(768),
  "created_at" timestamp with time zone not null default now(),
  constraint "document_chunks_pkey" primary key (chunk_id),
  constraint "document_chunks_document_id_fkey" foreign key (document_id) references public.documents(document_id) on delete cascade
);

create index "idx_document_chunks_document_id"
  on "public"."document_chunks" using btree (document_id, chunk_index);

create index "idx_document_chunks_embedding"
  on "public"."document_chunks" using hnsw (embedding extensions.vector_cosine_ops);

alter table "public"."document_chunks"
  enable row level security;

create policy "document_chunks_read_own" on "public"."document_chunks"
  for select
  to "authenticated"
  using (document_id in (
    select document_id from public.documents
    where profile_id = auth.uid()
  ));

create policy "document_chunks_insert_own" on "public"."document_chunks"
  for insert
  to "authenticated"
  with check (document_id in (
    select document_id from public.documents
    where profile_id = auth.uid()
  ));

create policy "document_chunks_delete_own" on "public"."document_chunks"
  for delete
  to "authenticated"
  using (document_id in (
    select document_id from public.documents
    where profile_id = auth.uid()
  ));
