import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest, setGlobalLogoutHandler } from "@/lib/queryClient";

type User = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  branchId: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const logout = async () => {
    try {
      // Call backend to clear JWT cookie
      await apiRequest("/api/auth/logout", "POST");
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Continue with logout even if API call fails
    }

    // Clear all auth state
    setUser(null);
    localStorage.removeItem("user");
    
    // Clear React Query cache
    queryClient.clear();
    
    // Redirect to login
    setLocation("/login");
  };

  // Set up global 401 handler on mount
  useEffect(() => {
    setGlobalLogoutHandler(logout);
  }, []);

  // Verify session with server on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        // Try to get current user from server (validates JWT cookie)
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // Sync to localStorage as cache
          localStorage.setItem("user", JSON.stringify(userData));
        } else {
          // Session invalid - clear localStorage
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      // Call backend login endpoint
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      // Backend sets JWT cookie, now verify session
      const meResponse = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        return userData;
      } else {
        throw new Error("Session verification failed");
      }
    } catch (error) {
      // Clear any stale data
      setUser(null);
      localStorage.removeItem("user");
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
