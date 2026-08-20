create table "public"."templates" (
  "template_id" uuid                     not null default gen_random_uuid(),
  "profile_id"  uuid                     not null,
  "name"        text                     not null,
  "description" text,
  "category"    text,
  "tags"        text[],
  "content"     jsonb                    not null default '{}'::jsonb,
  "is_public"   boolean                  not null default false,
  "created_at"  timestamp with time zone not null default now(),
  "updated_at"  timestamp with time zone not null default now(),
  constraint "templates_pkey" primary key (template_id),
  constraint "templates_profile_id_fkey" foreign key (profile_id) references public.profiles(profile_id) on delete cascade,
  constraint "templates_profile_id_name_key" unique (profile_id, name)
);

alter table "public"."templates"
  enable row level security;

create policy "templates_delete_own" on "public"."templates"
  for delete
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "templates_insert_own" on "public"."templates"
  for insert
  to "authenticated"
  with check (((profile_id = auth.uid()) AND (is_public = false)));

create policy "templates_select_own" on "public"."templates"
  for select
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "templates_update_own" on "public"."templates"
  for update
  to "authenticated"
  using ((profile_id = auth.uid()))
  with check (((profile_id = auth.uid()) AND (is_public = false)));

grant maintain, references, trigger, truncate on table "public"."templates" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."templates" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."templates" to "service_role";
