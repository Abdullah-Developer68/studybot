create table "public"."chat_messages" (
  "message_id"  uuid                     not null default gen_random_uuid(),
  "session_id"  uuid                     not null,
  "role"        text                     not null,
  "content"     text                     not null,
  "attachments" jsonb                    default '[]'::jsonb,
  "created_at"  timestamp with time zone not null default now(),
  constraint "chat_messages_pkey" primary key (message_id),
  constraint "chat_messages_role_check" check ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text]))),
  constraint "chat_messages_session_id_fkey" foreign key (session_id) references public.chat_sessions(session_id) on delete cascade
);

alter table "public"."chat_messages"
  enable row level security;

create index idx_chat_messages_created_at on public.chat_messages using btree (created_at desc);

create index idx_chat_messages_session_id on public.chat_messages using btree (session_id, created_at);

create policy "chat_messages_delete_own" on "public"."chat_messages"
  for delete
  to "authenticated"
  using ((session_id in ( select chat_sessions.session_id
   from public.chat_sessions
  where (chat_sessions.profile_id = auth.uid()))));

create policy "chat_messages_insert_own" on "public"."chat_messages"
  for insert
  to "authenticated"
  with check ((session_id IN ( SELECT chat_sessions.session_id
   FROM public.chat_sessions
  WHERE (chat_sessions.profile_id = auth.uid()))));

create policy "chat_messages_read_own" on "public"."chat_messages"
  for select
  to "authenticated"
  using ((session_id in ( select chat_sessions.session_id
   from public.chat_sessions
  where (chat_sessions.profile_id = auth.uid()))));

grant maintain, references, trigger, truncate on table "public"."chat_messages" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."chat_messages" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."chat_messages" to "service_role";
