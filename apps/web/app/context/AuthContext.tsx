"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  initializeSupabase,
  onAuthStateChange,
  getUserFromSession,
} from "@studybot/supabase";
import type { AuthContextValue } from "@/types/context.types";

// Create the shared Supabase client once when this module loads. The
// @studybot/supabase SDK resolves this singleton internally, so feature code
// never creates or passes a client itself. Static NEXT_PUBLIC refs let
// Next.js inline the values at build time; fallbacks keep static prerender
// from crashing when env vars are not configured on the host.
initializeSupabase({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  publishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "placeholder",
});

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateUser = async () => {
      try {
        const result = await getUserFromSession();

        if (!isMounted) return;

        if (result?.error) {
          setUser(null);
          setAccessToken(null);
          setLoading(false);
          return;
        }

        setUser(result?.user ?? null);
        setAccessToken(result?.session?.access_token ?? null);
        setLoading(false);
      } catch {
        if (!isMounted) return;
        setUser(null);
        setAccessToken(null);
        setLoading(false);
      }
    };

    hydrateUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Listen for auth state changes
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN") {
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? null);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setAccessToken(null);
      } else if (event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? null);
      } else if (event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
