"use client";
import { ReactNode } from "react";
import { Authenticated, AuthLoading } from "convex/react";
import { redirect } from "next/navigation";
import { useConvexAuth } from "convex/react";

function AuthLoadingUI({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (!isLoading && !isAuthenticated) {
    redirect("/sign-in");
  }
  return (
    <main>
      <AuthLoading>
        <AuthLoadingUI message="Verifying session..." />
      </AuthLoading>

      <Authenticated>{children}</Authenticated>
    </main>
  );
}
