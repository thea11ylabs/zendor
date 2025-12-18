"use client";

import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import {
  FileText,
  Plus,
  Github,
  LogOut,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        {/* Background */}
        <div
          className="fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.25), transparent 70%), #000000",
          }}
        />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Sign in to Zendor</h1>
          <p className="text-zinc-400 text-center max-w-md mb-8">
            Connect your GitHub account to save your documents and access them from anywhere.
          </p>
          <button
            onClick={() => login("/dashboard")}
            className="flex items-center gap-3 px-6 py-3 bg-white text-zinc-900 rounded-xl font-medium hover:bg-zinc-100 transition-colors"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>
          <Link
            href="/editor"
            className="mt-4 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            or continue without signing in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.15), transparent 70%), #000000",
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Zendor</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.image && (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-zinc-300">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome back, {user?.name?.split(" ")[0] || "there"}!
            </h1>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Your documents are stored locally in your browser. Start editing or create a new document.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/editor"
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors"
              >
                Open Editor
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/editor?new=true"
                className="flex items-center gap-2 px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-900 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Document
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Link
              href="/editor"
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-700 transition-colors"
            >
              <FileText className="w-8 h-8 text-violet-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Markdown Editor</h3>
              <p className="text-zinc-400 text-sm">Write and preview markdown with LaTeX support</p>
            </Link>
            <Link
              href="/latex-editor"
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-700 transition-colors"
            >
              <FileText className="w-8 h-8 text-violet-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">LaTeX Editor</h3>
              <p className="text-zinc-400 text-sm">Full LaTeX editing with live preview</p>
            </Link>
            <Link
              href="/slides"
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-700 transition-colors"
            >
              <FileText className="w-8 h-8 text-violet-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Slides</h3>
              <p className="text-zinc-400 text-sm">Create presentations with markdown</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
