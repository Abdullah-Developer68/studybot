import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Minimal storage contract shared by both platforms: on web, omit storage so
// supabase-js falls back to localStorage; on React Native, the Expo app
// passes AsyncStorage here so sessions survive app restarts.
export type SupabaseStorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

export type InitializeSupabaseOptions = {
  url: string;
  publishableKey: string;
  // Optional storage override — required on React Native (AsyncStorage).
  storage?: SupabaseStorageAdapter;
  // Must be false on native since there is no browser URL to parse OAuth
  // redirects from. Keep the default (true) on web for OAuth to work.
  detectSessionInUrl?: boolean;
};

// The registry keeps a creation factory plus the built instance. The factory
// lets getSupabase() self-heal if a module somehow runs before the app's
// initializeSupabase() call, so call ordering never breaks consumers.
let clientFactory: (() => SupabaseClient) | null = null;
let clientInstance: SupabaseClient | null = null;

// Called once by the host app at startup (web: root provider module, Expo:
// app entry layout). Registers the creation config and eagerly builds the
// client so misconfiguration fails fast at startup rather than on first use.
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
