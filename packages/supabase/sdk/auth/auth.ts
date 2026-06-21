import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthCallback, OAuthProvider } from "../types/auth.sdk.types";

// asserts tells TS that this function verifies the value at runtime. if it does not throw,
// the value is safe to use as SupabaseClient. if assert is not used we will get a compile time error
// as TS will think supabase can be null or undefined, but using assert tells TS to assume
// that after the function returns successfully that check has passed. if function throws error then
// the supabase client is not valid or not provided.
function ensureClient(
  supabase: SupabaseClient | null | undefined,
): asserts supabase is SupabaseClient {
  if (!supabase?.auth) {
    throw new Error("Supabase client is required");
  }
}

// Registers a new user using email/password credentials.
const signUp = async (
  supabase: SupabaseClient | null | undefined,
  email: string,
  password: string,
) => {
  ensureClient(supabase);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Signs in an existing user using email/password credentials.
const signIn = async (
  supabase: SupabaseClient | null | undefined,
  email: string,
  password: string,
) => {
  ensureClient(supabase);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Signs out the currently authenticated user.
const signOut = async (supabase: SupabaseClient | null | undefined) => {
  ensureClient(supabase);
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

// Logs out the current user - semantic alias for signOut used by client UIs.
const logout = async (supabase: SupabaseClient | null | undefined) => {
  return signOut(supabase);
};

// Starts OAuth sign-in flow for the given provider.
const signInWithOAuth = async (
  supabase: SupabaseClient | null | undefined,
  provider: OAuthProvider,
  redirectTo: string | null = null,
) => {
  ensureClient(supabase);
  const options: { redirectTo?: string } = {};

  if (redirectTo) {
    options.redirectTo = redirectTo;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Retrieves the currently authenticated user from Supabase auth service.
const getUser = async (supabase: SupabaseClient | null | undefined) => {
  ensureClient(supabase);

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return {
      user: null,
      error: error.message,
    };
  }

  return {
    user: data?.user ?? null,
    error: null,
  };
};

// Resolves user and session from local session state without making a second user fetch request.
const getUserFromSession = async (
  supabase: SupabaseClient | null | undefined,
) => {
  try {
    ensureClient(supabase);

    const { data: sessionResult, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      return {
        user: null,
        session: null,
        error: sessionError.message,
      };
    }

    const session = sessionResult?.session ?? null;

    if (!session) {
      return {
        user: null,
        session: null,
        error: null,
      };
    }

    return {
      user: session?.user ?? null,
      session,
      error: null,
    };
  } catch (error: unknown) {
    return {
      user: null,
      session: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to resolve user from session",
    };
  }
};

// Subscribes to auth state changes and returns the active subscription.
const onAuthStateChange = (
  supabase: SupabaseClient | null | undefined,
  callback: AuthCallback,
) => {
  ensureClient(supabase);
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
};

export {
  signUp,
  signIn,
  signOut,
  logout,
  signInWithOAuth,
  getUser,
  getUserFromSession,
  onAuthStateChange,
};
