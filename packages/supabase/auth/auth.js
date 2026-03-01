const ensureClient = (supabaseClient) => {
  if (!supabaseClient?.auth) {
    throw new Error("Supabase client is required");
  }
};

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

const signOut = async (supabaseClient) => {
  ensureClient(supabaseClient);
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

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

const getSession = async (supabaseClient) => {
  ensureClient(supabaseClient);
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const getUser = async (supabaseClient) => {
  ensureClient(supabaseClient);
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const getUserFromSession = async (supabaseClient) => {
  try {
    ensureClient(supabaseClient);

    const sessionResult = await getSession(supabaseClient);
    const session = sessionResult?.session ?? null;

    if (!session) {
      return {
        user: null,
        session: null,
        error: null,
      };
    }

    const userResult = await getUser(supabaseClient);

    return {
      user: userResult?.user ?? null,
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
  getSession,
  getUser,
  getUserFromSession,
  onAuthStateChange,
};
