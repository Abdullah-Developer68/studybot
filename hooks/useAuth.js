"use client";

import { useAuth as useAuthContext } from "@/app/context/AuthContext";

/**
 * Custom hook for accessing authentication state and user information
 *
 * @returns {{
 *   user: object | null,
 *   loading: boolean,
 *   isAuthenticated: boolean,
 *   userId: string | null
 * }}
 *
 * @example
 * const { user, loading, isAuthenticated, userId } = useAuth();
 *
 * if (loading) return <div>Loading...</div>;
 * if (!isAuthenticated) return <div>Please log in</div>;
 *
 * return <div>Welcome, {user.email}!</div>;
 */
const useAuth = () => {
  return useAuthContext();
};

export default useAuth;
