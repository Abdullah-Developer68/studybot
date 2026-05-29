import type { SupabaseClient } from "@supabase/supabase-js";

type AuthCallback = Parameters<
  SupabaseClient["auth"]["onAuthStateChange"]
>[0];

type OAuthProvider = Parameters<
  SupabaseClient["auth"]["signInWithOAuth"]
  >[0]["provider"];

export type {AuthCallback, OAuthProvider};
