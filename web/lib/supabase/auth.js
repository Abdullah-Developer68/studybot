import { createClient } from "@/utils/supabase/client";

/**
 * Supabase Auth Service
 * Client-side authentication functions for reusability across web and mobile apps
 */

/**
 * Get the Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
const getSupabase = () => createClient();

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const signUp = async (email, password) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Sign in a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const signIn = async (email, password) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 * @param {string} provider - OAuth provider name ('google', 'github', etc.)
 * @param {string} redirectTo - URL to redirect after authentication
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const signInWithOAuth = async (provider, redirectTo = null) => {
  const supabase = getSupabase();

  const options = {};
  if (redirectTo) {
    options.redirectTo = redirectTo;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Sign out the current user
 * @returns {Promise<{error: string | null}>}
 */
export const signOut = async () => {
  const supabase = getSupabase();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

/**
 * Get the current authenticated user
 * @returns {Promise<{user: object | null, error: string | null}>}
 */
export const getUser = async () => {
  const supabase = getSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { user: null, error: error.message };
  }

  return { user, error: null };
};

/**
 * Get the current session
 * @returns {Promise<{session: object | null, error: string | null}>}
 */
export const getSession = async () => {
  const supabase = getSupabase();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return { session: null, error: error.message };
  }

  return { session, error: null };
};

/**
 * Send a password reset email
 * @param {string} email - User's email
 * @param {string} redirectTo - URL to redirect after password reset
 * @returns {Promise<{error: string | null}>}
 */
export const resetPassword = async (email, redirectTo = null) => {
  const supabase = getSupabase();

  const options = {};
  if (redirectTo) {
    options.redirectTo = redirectTo;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, options);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

/**
 * Update user's password
 * @param {string} newPassword - New password
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const updatePassword = async (newPassword) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Update user's email
 * @param {string} newEmail - New email
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const updateEmail = async (newEmail) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Update user's profile data
 * @param {object} userData - User data to update (e.g., { data: { full_name: 'John' } })
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const updateProfile = async (userData) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.updateUser(userData);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Listen for auth state changes
 * @param {function} callback - Callback function that receives (event, session)
 * @returns {object} Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  const supabase = getSupabase();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
};

/**
 * Verify OTP (One-Time Password)
 * @param {string} email - User's email
 * @param {string} token - OTP token
 * @param {string} type - Type of OTP ('signup', 'recovery', 'email_change', etc.)
 * @returns {Promise<{data: object | null, error: string | null}>}
 */
export const verifyOtp = async (email, token, type = "email") => {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Resend OTP for email confirmation
 * @param {string} email - User's email
 * @param {string} type - Type of OTP ('signup', 'email_change', etc.)
 * @returns {Promise<{error: string | null}>}
 */
export const resendOtp = async (email, type = "signup") => {
  const supabase = getSupabase();

  const { error } = await supabase.auth.resend({
    email,
    type,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};
