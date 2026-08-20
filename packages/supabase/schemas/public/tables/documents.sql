create table "public"."documents" (
  "document_id"    uuid                     not null default gen_random_uuid(),
  "profile_id"     uuid                     not null,
  "name"           text                     not null,
  "file_name"      text                     not null,
  "file_type"      text                     not null,
  "file_size"      bigint                   not null,
  "storage_path"   text,
  "extracted_text" text,
  "was_truncated"  boolean                  default false,
  "session_id"     uuid,
  "chunk_count"    integer                  not null default 0,
  "created_at"     timestamp with time zone not null default now(),
  constraint "documents_pkey" primary key (document_id),
  constraint "documents_profile_id_fkey" foreign key (profile_id) references public.profiles(profile_id) on delete cascade,
  constraint "documents_session_id_fkey" foreign key (session_id) references public.chat_sessions(session_id) on delete set null
);

create index "idx_documents_session_id"
  on "public"."documents" using btree (session_id);

alter table "public"."documents"
  enable row level security;

create policy "documents_delete_own" on "public"."documents"
  for delete
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "documents_insert_own" on "public"."documents"
  for insert
  to "authenticated"
  with check ((profile_id = auth.uid()));

create policy "documents_read_own" on "public"."documents"
  for select
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "documents_update_own" on "public"."documents"
  for update
  to "authenticated"
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

grant maintain, references, trigger, truncate on table "public"."documents" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."documents" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."documents" to "service_role";
