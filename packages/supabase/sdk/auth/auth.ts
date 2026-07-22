import { getSupabase } from "../client/client";
import { AuthCallback, OAuthProvider } from "../types/auth.sdk.types";

// Registers a new user using email/password credentials.
const signUp = async (email: string, password: string) => {
  const supabase = getSupabase();
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
const signIn = async (email: string, password: string) => {
  const supabase = getSupabase();
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
const signOut = async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

// Logs out the current user - semantic alias for signOut used by client UIs.
const logout = async () => {
  return signOut();
};

// Starts OAuth sign-in flow for the given provider.
const signInWithOAuth = async (
  provider: OAuthProvider,
  redirectTo: string | null = null,
) => {
  const supabase = getSupabase();
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
const getUser = async () => {
  const supabase = getSupabase();

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
const getUserFromSession = async () => {
  try {
    const supabase = getSupabase();

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
const onAuthStateChange = (callback: AuthCallback) => {
  const supabase = getSupabase();
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
