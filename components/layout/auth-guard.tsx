"use client";
import { ReactNode } from "react";
import { Authenticated, AuthLoading } from "convex/react";
import { redirect } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Loader } from "lucide-react";

function AuthLoadingUI({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader className="w-8 h-8 text-violet-400 animate-spin" />
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
