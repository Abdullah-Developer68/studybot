create table "public"."detection_results" (
  "detection_id"      uuid                     not null default gen_random_uuid(),
  "assignment_id"     uuid                     not null,
  "overall_score"     numeric(5,2)             not null,
  "sentence_analysis" jsonb                    not null default '[]'::jsonb,
  "provider"          text,
  "created_at"        timestamp with time zone not null default now(),
  constraint "detection_results_assignment_id_fkey" foreign key (assignment_id) references public.assignments(assignment_id) on delete cascade,
  constraint "detection_results_pkey" primary key (detection_id)
);

alter table "public"."detection_results"
  enable row level security;

create policy "detection_results_delete_own" on "public"."detection_results"
  for delete
  to "authenticated"
  using ((assignment_id in ( select assignments.assignment_id
   from public.assignments
  where (assignments.profile_id = auth.uid()))));

create policy "detection_results_insert_own" on "public"."detection_results"
  for insert
  to "authenticated"
  with check ((assignment_id IN ( SELECT assignments.assignment_id
   FROM public.assignments
  WHERE (assignments.profile_id = auth.uid()))));

create policy "detection_results_read_own" on "public"."detection_results"
  for select
  to "authenticated"
  using ((assignment_id in ( select assignments.assignment_id
   from public.assignments
  where (assignments.profile_id = auth.uid()))));

grant maintain, references, trigger, truncate on table "public"."detection_results" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."detection_results" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."detection_results" to "service_role";
