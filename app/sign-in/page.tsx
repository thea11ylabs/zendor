"use client";

import { authClient } from "@/lib/auth-client";
import { Github, FileText, Loader } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-black bg-radial-[ellipse_80%_60%_at_50%_0%,rgba(139,92,246,0.25),transparent_70%]" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-white">Zendor</span>
          </div>

          {/* Sign in card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Sign in to Zendor
            </h1>
            <p className="text-zinc-400 text-center mb-8">
              Connect your GitHub account to save and sync your documents
            </p>

            <button
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-zinc-900 rounded-xl font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              Continue with GitHub
            </button>

            <div className="mt-6 text-center">
              <Link
                href="/editor"
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
              >
                or continue without signing in
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-500 mt-8">
            By signing in, you agree to our{" "}
            <a href="#" className="text-zinc-400 hover:text-white">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-zinc-400 hover:text-white">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
