revoke all on table "public"."document_chunks" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate on table "public"."document_chunks" to "authenticated";
