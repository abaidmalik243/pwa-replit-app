import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  login: (userData: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

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

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

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
