"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  login?: string; // GitHub username
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (redirect?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = localStorage.getItem("zendor_user");
      if (!storedUser) return null;
      return JSON.parse(storedUser) as User;
    } catch {
      try {
        localStorage.removeItem("zendor_user");
      } catch {
        // ignore
      }
      return null;
    }
  });
  const [isLoading] = useState(false);

  const login = (redirect?: string) => {
    // Store redirect URL and go to sign-in page
    if (redirect) {
      if (typeof window !== "undefined") {
        localStorage.setItem("zendor_redirect", redirect);
      }
    }
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zendor_user");
      setUser(null);
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
