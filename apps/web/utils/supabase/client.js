
import { createBrowserClient } from "@supabase/ssr";

// Static env references let Next.js inline build-time values for the
// browser bundle and prevent the client from being created with undefined
// URL/key during static prerender.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  );
