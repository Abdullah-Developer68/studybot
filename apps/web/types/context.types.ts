import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
};

export type { AuthContextValue };
