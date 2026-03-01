// Ensures a valid Supabase client with auth capabilities is provided.
const ensureClient = (supabaseClient) => {
  if (!supabaseClient?.auth) {
    throw new Error("Supabase client is required");
  }
};

// Registers a new user using email/password credentials.
const signUp = async (supabaseClient, email, password) => {
  ensureClient(supabaseClient);
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Signs in an existing user using email/password credentials.
const signIn = async (supabaseClient, email, password) => {
  ensureClient(supabaseClient);
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// Signs out the currently authenticated user.
const signOut = async (supabaseClient) => {
  ensureClient(supabaseClient);
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

// Starts OAuth sign-in flow for the given provider.
const signInWithOAuth = async (supabaseClient, provider, redirectTo = null) => {
  ensureClient(supabaseClient);
  const options = {};

  if (redirectTo) {
    options.redirectTo = redirectTo;
  }

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Retrieves the currently authenticated user from Supabase auth service.
const getUser = async (supabaseClient) => {
  ensureClient(supabaseClient);

  const { data, error } = await supabaseClient.auth.getUser();

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
const getUserFromSession = async (supabaseClient) => {
  try {
    ensureClient(supabaseClient);

    const { data: sessionResult, error: sessionError } =
      await supabaseClient.auth.getSession();

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
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error?.message || "Failed to resolve user from session",
    };
  }
};

// Subscribes to auth state changes and returns the active subscription.
const onAuthStateChange = (supabaseClient, callback) => {
  ensureClient(supabaseClient);
  const {
    data: { subscription },
  } = supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
};

export {
  signUp,
  signIn,
  signOut,
  signInWithOAuth,
  getUser,
  getUserFromSession,
  onAuthStateChange,
};
