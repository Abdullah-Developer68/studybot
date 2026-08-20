create table "public"."assignments" (
  "assignment_id"       uuid                     not null default gen_random_uuid(),
  "profile_id"          uuid                     not null,
  "template_id"         uuid,
  "title"               text                     not null,
  "content"             jsonb                    not null default '{}'::jsonb,
  "original_content"    text,
  "humanized_content"   text,
  "status"              text                     not null default 'draft'::text,
  "detection_score"     numeric(5,2),
  "humanization_passes" integer                  default 0,
  "created_at"          timestamp with time zone not null default now(),
  "updated_at"          timestamp with time zone not null default now(),
  constraint "assignments_pkey" primary key (assignment_id),
  constraint "assignments_status_check" check ((status = ANY (ARRAY['draft'::text, 'processing'::text, 'humanized'::text, 'exported'::text]))),
  constraint "assignments_profile_id_fkey" foreign key (profile_id) references public.profiles(profile_id) on delete cascade,
  constraint "assignments_template_id_fkey" foreign key (template_id) references public.templates(template_id) on delete set null
);

alter table "public"."assignments"
  enable row level security;

create policy "assignments_delete_own" on "public"."assignments"
  for delete
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "assignments_insert_own" on "public"."assignments"
  for insert
  to "authenticated"
  with check ((profile_id = auth.uid()));

create policy "assignments_read_own" on "public"."assignments"
  for select
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "assignments_update_own" on "public"."assignments"
  for update
  to "authenticated"
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

grant maintain, references, trigger, truncate on table "public"."assignments" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."assignments" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."assignments" to "service_role";
