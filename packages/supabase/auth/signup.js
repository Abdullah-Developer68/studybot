const signUpUser = async (supabaseClient, email, password) => {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
    return data;
  }
};

const signInUser = async (supabaseClient, email, password) => {
  const { data, error } = await supabaseClient.auth.signIn({
    email,
    password,
  });

  if (error) {  
    throw new Error(error.message);
  }
  return data;
};