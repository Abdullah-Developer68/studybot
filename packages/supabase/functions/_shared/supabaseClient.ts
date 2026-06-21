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
