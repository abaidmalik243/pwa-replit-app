import { useEffect } from "react";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (requireAuth) {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setLocation("/login");
        return;
      }

      if (requireRole) {
        const user = JSON.parse(userStr);
        if (!requireRole.includes(user.role)) {
          setLocation("/");
          return;
        }
      }
    }
  }, [requireAuth, requireRole, setLocation]);

  const userStr = localStorage.getItem("user");
  if (requireAuth && !userStr) {
    return null;
  }

  if (requireRole && userStr) {
    const user = JSON.parse(userStr);
    if (!requireRole.includes(user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}
