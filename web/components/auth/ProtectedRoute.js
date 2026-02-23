"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

/**
 * ProtectedRoute Component
 * Wraps pages/components that require authentication
 * Redirects to /auth if user is not authenticated
 *
 * @param {React.ReactNode} children - The protected content
 * @param {string} redirectTo - Where to redirect if not authenticated (default: /auth)
 * @param {React.ReactNode} loadingComponent - Custom loading component (optional)
 *
 * @example
 * // In a page component:
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   );
 * }
 */
const ProtectedRoute = ({
  children,
  redirectTo = "/auth",
  loadingComponent = null,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname;
      const redirectUrl =
        currentPath !== "/" ? `${redirectTo}?redirectTo=${currentPath}` : redirectTo;
      router.push(redirectUrl);
    }
  }, [loading, isAuthenticated, router, redirectTo]);

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

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;
