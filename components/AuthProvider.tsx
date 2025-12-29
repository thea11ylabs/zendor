"use client";

import { createContext, useContext, ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { authClient } from "@/lib/auth-client";

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
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data: session } = authClient.useSession();

  const login = (redirect?: string) => {
    // Store redirect URL and go to sign-in page
    if (redirect && typeof window !== "undefined") {
      localStorage.setItem("zendor_redirect", redirect);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  };

  const logout = async () => {
    await authClient.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || "User",
        email: session.user.email || "",
        image: session.user.image,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
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
