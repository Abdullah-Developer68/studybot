// NOTE: With the migration to @supabase/server and the withSupabase wrapper,
// most functions now receive pre-configured Supabase clients via ctx.supabase
// and ctx.supabaseAdmin. These helpers are no longer needed for the standard
// user-authenticated pattern.
//
// This file is kept for two remaining scenarios:
//   1. Functions that need a custom Supabase client outside the withSupabase
//      wrapper (e.g. when using createSupabaseContext for custom error handling
//      instead of withSupabase).
//   2. Utility scripts, one-off jobs, or non-HTTP contexts that need a Supabase
//      client but don't have a Request object to pass to withSupabase.
//
// For standard edge functions, prefer ctx.supabase (RLS-scoped) or
// ctx.supabaseAdmin (service role) from the withSupabase wrapper instead.

import { createClient } from "@supabase/supabase-js";

// For user-authenticated requests (respects Row Level Security)
export const getSupabaseClient = (req: Request) => {
  const authHeader = req.headers.get("Authorization");

  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: authHeader || "",
        },
      },
    },
  );
};

// For admin tasks (bypasses Row Level Security - use SERVICE_ROLE_KEY)
export const getAdminClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
};
