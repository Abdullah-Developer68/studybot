create table "public"."profiles" (
  "profile_id"    uuid                     not null,
  "name"          text,
  "email"         text,
  "profile_pic"   text,
  "payment_plan"  text                     not null default 'free'::text,
  "usage_credits" integer                  not null default 100,
  "created_at"    timestamp with time zone not null default now(),
  "updated_at"    timestamp with time zone not null default now(),
  constraint "profiles_payment_plan_check" check ((payment_plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text]))),
  constraint "profiles_pkey" primary key (profile_id),
  constraint "profiles_profile_id_fkey" foreign key (profile_id) references auth.users(id) on delete cascade
);

alter table "public"."profiles"
  enable row level security;

create policy "profiles_delete_own" on "public"."profiles"
  for delete
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "profiles_insert_own" on "public"."profiles"
  for insert
  to "authenticated"
  with check ((profile_id = auth.uid()));

create policy "profiles_read_own" on "public"."profiles"
  for select
  to "authenticated"
  using ((profile_id = auth.uid()));

create policy "profiles_update_own" on "public"."profiles"
  for update
  to "authenticated"
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

grant maintain, references, trigger, truncate on table "public"."profiles" to "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "authenticated", "postgres";

grant maintain, references, trigger, truncate on table "public"."profiles" to "service_role";
