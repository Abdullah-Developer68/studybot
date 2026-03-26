"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/auth/useAuth";

/**
 * PublicRoute Component
 * Wraps pages/components that should only be accessible when NOT authenticated
 * Redirects to home (or specified route) if user is already authenticated
 *
 * @param {React.ReactNode} children - The public content
 * @param {string} redirectTo - Where to redirect if authenticated (default: /)
 * @param {React.ReactNode} loadingComponent - Custom loading component (optional)
 *
 * @example
 * // In the auth page:
 * export default function AuthPage() {
 *   return (
 *     <PublicRoute>
 *       <LoginForm />
 *     </PublicRoute>
 *   );
 * }
 */
const PublicRoute = ({
  children,
  redirectTo = "/",
  loadingComponent = null,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if there's a redirectTo param in the URL (from ProtectedRoute)
      const redirectPath = searchParams.get("redirectTo");
      router.push(redirectPath || redirectTo);
    }
  }, [loading, isAuthenticated, router, redirectTo, searchParams]);

  // Show loading state
  if (loading) {
    return (
      loadingComponent || (
        <div className="w-full h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if authenticated
  if (isAuthenticated) {
    return null;
  }

  // User is not authenticated, render children
  return <>{children}</>;
};

export default PublicRoute;
