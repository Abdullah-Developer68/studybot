const signUpUser = async (supabaseClient, email, password) => {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const signInUser = async (supabaseClient, email, password) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const signOutUser = async (supabaseClient) => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

const signInWithOAuthUser = async (
  supabaseClient,
  provider,
  redirectTo = null,
) => {
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

const getUserSession = async (supabaseClient) => {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const getCurrentUser = async (supabaseClient) => {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const onAuthStateChange = (supabaseClient, callback) => {
  const {
    data: { subscription },
  } = supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
};

export {
  signUpUser,
  signInUser,
  signOutUser,
  signInWithOAuthUser,
  getUserSession,
  getCurrentUser,
  onAuthStateChange,
};
