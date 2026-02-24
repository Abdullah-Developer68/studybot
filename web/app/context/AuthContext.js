"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChange,
  getUserSession,
  getCurrentUser,
} from "@packages/supabase/index.supabase";
import supabaseClient from "@/utils/supabase/client";
import { useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUserFromSession = useCallback(async () => {
    try {
      // First check if there's an active session on mount
      const sessionData = await getUserSession(supabaseClient);

      const session = sessionData?.session;

      if (!session) {
        // normal signed-out state
        setUser(null);
        return;
      }

      const userData = await getCurrentUser(supabaseClient);
      setUser(userData?.user ?? null);
    } catch (error) {
      // optional: log once
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getUserFromSession();
  }, [getUserFromSession]);

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
