alter default privileges for role "postgres" in schema "public" grant update on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant update on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant update on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on FUNCTIONS from public;

alter default privileges for role "postgres" in schema "public" grant maintain, references, trigger, truncate on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant maintain, references, trigger, truncate on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant maintain, references, trigger, truncate on tables to "service_role";
