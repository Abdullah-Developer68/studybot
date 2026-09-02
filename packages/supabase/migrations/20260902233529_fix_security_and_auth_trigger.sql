set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

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

create or replace function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path to 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create event trigger "ensure_rls"
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function "public"."rls_auto_enable"();

revoke all on function "public"."handle_new_user"() from public;

revoke all on function "public"."handle_new_user"() from "service_role";

grant execute on function "public"."handle_new_user"() to "service_role";

revoke all on function "public"."match_document_chunks"(uuid, extensions.vector, integer) from public;

revoke all on function "public"."match_document_chunks"(uuid, extensions.vector, integer) from "authenticated";

grant execute on function "public"."match_document_chunks"(uuid, extensions.vector, integer) to "authenticated";

revoke all on function "public"."match_document_chunks"(uuid, extensions.vector, integer) from "service_role";

grant execute on function "public"."match_document_chunks"(uuid, extensions.vector, integer) to "service_role";

revoke all on function "public"."rls_auto_enable"() from public;

grant execute on function "public"."rls_auto_enable"() to "postgres", "service_role";

revoke all on table "public"."assignments" from "anon";

grant maintain, references, select, trigger on table "public"."assignments" to "anon";

revoke all on table "public"."assignments" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."assignments" to "service_role";

revoke all on table "public"."chat_messages" from "anon";

grant maintain, references, select, trigger on table "public"."chat_messages" to "anon";

revoke all on table "public"."chat_messages" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."chat_messages" to "service_role";

revoke all on table "public"."chat_sessions" from "anon";

grant maintain, references, select, trigger on table "public"."chat_sessions" to "anon";

revoke all on table "public"."chat_sessions" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."chat_sessions" to "service_role";

revoke all on table "public"."detection_results" from "anon";

grant maintain, references, select, trigger on table "public"."detection_results" to "anon";

revoke all on table "public"."detection_results" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."detection_results" to "service_role";

revoke all on table "public"."document_chunks" from "anon";

grant maintain, references, select, trigger on table "public"."document_chunks" to "anon";

revoke all on table "public"."document_chunks" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."document_chunks" to "authenticated";

revoke all on table "public"."document_chunks" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."document_chunks" to "service_role";

revoke all on table "public"."documents" from "anon";

grant maintain, references, select, trigger on table "public"."documents" to "anon";

revoke all on table "public"."documents" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."documents" to "service_role";

revoke all on table "public"."profiles" from "anon";

grant maintain, references, select, trigger on table "public"."profiles" to "anon";

revoke all on table "public"."profiles" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "service_role";

revoke all on table "public"."templates" from "anon";

grant maintain, references, select, trigger on table "public"."templates" to "anon";

revoke all on table "public"."templates" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."templates" to "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";
