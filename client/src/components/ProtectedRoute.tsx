import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: string[];
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireRole 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for auth state to load
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (requireRole && user) {
      if (!requireRole.includes(user.role)) {
        setLocation("/");
        return;
      }
    }
  }, [requireAuth, requireRole, user, isAuthenticated, isLoading, setLocation]);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Not authenticated
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Wrong role
  if (requireRole && user && !requireRole.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
