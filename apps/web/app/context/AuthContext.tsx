"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { onAuthStateChange, getUserFromSession } from "@studybot/supabase";
import { createClient } from "@/utils/supabase/client";

const supabaseClient = createClient();

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateUser = async () => {
      try {
        const result = await getUserFromSession(supabaseClient);

        if (!isMounted) return;

        if (result?.error) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(result?.user ?? null);
        setLoading(false);
      } catch {
        if (!isMounted) return;
        setUser(null);
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
    const subscription = onAuthStateChange(
      supabaseClient,
      async (event, session) => {
        if (event === "SIGNED_IN") {
          setUser(session?.user ?? null);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        } else if (event === "TOKEN_REFRESHED") {
          setUser(session?.user ?? null);
        } else if (event === "USER_UPDATED") {
          setUser(session?.user ?? null);
        }
      },
    );

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
