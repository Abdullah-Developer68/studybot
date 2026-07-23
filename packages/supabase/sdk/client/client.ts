import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { InitializeSupabaseOptions } from "../types/client.sdk.types";

// The registry keeps both a client factory and the built instance. The factory
// stores the createClient() recipe, while the instance caches the actual
// SupabaseClient so callers reuse the same client until it is reset.
let clientFactory: (() => SupabaseClient) | null = null;
let clientInstance: SupabaseClient | null = null;

// Called once by the host app at startup (web: root provider module, Expo:
// app entry layout). Registers the createClient() recipe and eagerly builds
// the client so misconfiguration fails fast at startup rather than on first use.
const initializeSupabase = (
  options: InitializeSupabaseOptions,
): SupabaseClient => {
  if (clientInstance) {
    // Re-initialization replaces the client (expected during HMR), but it
    // drops any in-flight auth subscriptions, so keep it visible in dev.
    console.warn(
      "Supabase client re-initialized; replacing the existing instance.",
    );
  }

  clientFactory = () =>
    createClient(options.url, options.publishableKey, {
      auth: {
        storage: options.storage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: options.detectSessionInUrl ?? true,
        // Matches the PKCE flow the previous @supabase/ssr browser client
        // used, keeping OAuth behavior consistent after the migration.
        flowType: "pkce",
      },
    });

  clientInstance = clientFactory();
  return clientInstance;
};

// Escape hatch for tests or custom clients (e.g. an @supabase/ssr cookie
// client if server-side auth is ever added to the web app).
const setSupabaseClient = (client: SupabaseClient): void => {
  clientInstance = client;
};

// Internal resolver used by every SDK method. Lazily builds the client from
// the registered factory on first use when initialization already happened
// but the instance was cleared.
const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    if (!clientFactory) {
      throw new Error(
        "Supabase is not initialized. Call initializeSupabase() once at app startup.",
      );
    }
    clientInstance = clientFactory();
  }
  return clientInstance;
};

// Test/HMR helper that fully clears the registry.
const resetSupabase = (): void => {
  clientInstance = null;
  clientFactory = null;
};

export { initializeSupabase, setSupabaseClient, getSupabase, resetSupabase };
