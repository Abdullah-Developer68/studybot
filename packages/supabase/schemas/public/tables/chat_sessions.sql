create table "public"."chat_sessions" (
  "session_id"  uuid                     not null default gen_random_uuid(),
  "profile_id"  uuid                     not null,
  "title"       text                     not null default 'New Chat'::text,
  "model"       text                     default 'gemini-2.0-flash'::text,
  "is_archived" boolean                  default false,
  "created_at"  timestamp with time zone not null default now(),
  "updated_at"  timestamp with time zone not null default now(),
  constraint "chat_sessions_pkey" primary key (session_id),
  constraint "chat_sessions_profile_id_fkey" foreign key (profile_id) references public.profiles(profile_id) on delete cascade
);

alter table "public"."chat_sessions"
  enable row level security;

create index idx_chat_sessions_archived on public.chat_sessions using btree (profile_id, is_archived, updated_at desc);

create index idx_chat_sessions_profile_id on public.chat_sessions using btree (profile_id, updated_at desc);

create policy "chat_sessions_delete_own" on "public"."chat_sessions"
  for delete
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "chat_sessions_insert_own" on "public"."chat_sessions"
  for insert
  to "authenticated"
  with check ((profile_id = auth.uid()));

create policy "chat_sessions_read_own" on "public"."chat_sessions"
  for select
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "chat_sessions_update_own" on "public"."chat_sessions"
  for update
  to "authenticated"
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

grant maintain, references, trigger, truncate on table "public"."chat_sessions" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."chat_sessions" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."chat_sessions" to "service_role";
