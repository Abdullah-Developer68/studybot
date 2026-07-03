"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { onAuthStateChange, getUserFromSession } from "@studybot/supabase";
import { createClient } from "@/utils/supabase/client";
import type { AuthContextValue } from "@/types/context.types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy-create the browser client inside the component so it is not
  // instantiated during static prerender when browser APIs are absent.
  const supabaseClient = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateUser = async () => {
      try {
        const result = await getUserFromSession(supabaseClient);

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
    const subscription = onAuthStateChange(
      supabaseClient,
      async (event, session) => {
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
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
