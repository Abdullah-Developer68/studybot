"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChange, getUserFromSession } from "@studybot/supabase";
import { createClient } from "@/utils/supabase/client";

const supabaseClient = createClient();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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
    const subscription = onAuthStateChange(supabaseClient, (event, session) => {
      if (event === "SIGNED_IN") {
        setUser(session?.user ?? null);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
      } else if (event === "USER_UPDATED") {
        setUser(session?.user ?? null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
