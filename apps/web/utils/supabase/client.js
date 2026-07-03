import { createBrowserClient } from "@supabase/ssr";

// Static env references let Next.js inline build-time values for the
// browser bundle. Fallbacks prevent the build from crashing during
// static prerender when env vars are not yet configured on the host
// (e.g. a fresh Vercel project). The app will not function without
// the real values — set them in your deployment environment.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "placeholder",
  );
