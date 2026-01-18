"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Code2,
  Zap,
  BookOpen,
  MessageSquare,
  Bot,
  ArrowRight,
  Github,
  LayoutDashboard,
} from "lucide-react";
import { useConvexAuth } from "convex/react";

export default function LandingPage() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Violet Storm Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.25), transparent 70%), #000000",
        }}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="logo"
                width={100}
                height={100}
              />
            </div>
            <span className="font-bold text-xl text-white">Zendor</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/thea11ylabs/zendor"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              GitHub
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                Sign in
              </Link>
            )}
            <Link
              href="/editor"
              className="px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors"
            >
              Open Editor
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-900/30 text-violet-300 text-sm font-medium mb-8">
            Built for developers and ML researchers
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Write docs.
            <br />
            <span className="bg-linear-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Ship faster.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            The markdown editor that gets out of your way. LaTeX, citations, AI
            assistance, and everything you need to write technical docs without
            the bloat.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-xl text-base font-medium hover:bg-zinc-100 transition-colors"
            >
              Start Writing
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="https://github.com/thea11ylabs/zendor"
              className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl text-base font-medium hover:bg-zinc-900 transition-colors"
            >
              <Github className="w-4 h-4" />
              View Source
            </Link>
          </div>
        </div>
      </section>

      {/* Editor Preview */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-violet-500/10">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-zinc-800 rounded-md text-xs text-zinc-400">
                  README.md — Zendor
                </div>
              </div>
            </div>
            {/* Editor Content */}
            <div className="bg-zinc-950 p-8 font-mono text-sm">
              <div className="space-y-4">
                <div className="text-zinc-500"># Welcome to Zendor</div>
                <div className="text-zinc-300">
                  A self-hostable editor built for developers and CS researchers
                  who actually ship.
                </div>
                <div className="h-4" />
                <div className="text-zinc-500">## Features</div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-green-500">✓</span> LaTeX support with
                  $E = mc^2$
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-green-500">✓</span> BibTeX citations
                  \cite{"{"}smith2024{"}"}
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-green-500">✓</span> AI-powered writing
                  assistance
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-green-500">✓</span> Split view, preview,
                  visual editing
                </div>
                <div className="h-4" />
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-violet-900/30 text-violet-300 rounded text-xs">
                    AI
                  </span>
                  <span className="text-zinc-400 animate-pulse">|</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Built from the ground up for technical writing. No feature creep,
              no subscription fatigue.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Code2 className="w-6 h-6" />}
              title="Markdown First"
              description="Write in markdown, see it rendered beautifully. GitHub Flavored Markdown with syntax highlighting."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="LaTeX & Citations"
              description="Full LaTeX math support and BibTeX citations. IEEE formatting out of the box."
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="AI Assistant"
              description="Context-aware AI that knows your document. Get help writing, editing, and ideating."
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Comments"
              description="Add comments to your docs like Google Docs. Great for self-review or collaboration."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Blazing Fast"
              description="Built with Next.js 15. No electron bloat. Opens instantly, runs smoothly."
            />
            <FeatureCard
              icon={<Github className="w-6 h-6" />}
              title="GitHub Ready"
              description="Export markdown, sync with repos, write READMEs. Built for the GitHub workflow you already use."
            />
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="relative z-10 px-6 py-16 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-zinc-500 mb-8 uppercase tracking-wider">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            <span className="text-xl font-semibold text-zinc-600">
              DoorDash
            </span>
            <span className="text-xl font-semibold text-zinc-600">
              LinkedIn
            </span>
            <span className="text-xl font-semibold text-zinc-600">
              Rose Rocket
            </span>
            <span className="text-xl font-semibold text-zinc-600">Stripe</span>
            <span className="text-xl font-semibold text-zinc-600">Vercel</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-12 md:p-16 text-center">
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to write better docs?
              </h2>
              <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
                No sign up required. Your data stays in your browser. Just open
                and start writing.
              </p>
              <Link
                href="/editor"
                className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-xl text-lg font-semibold hover:bg-violet-500 transition-colors"
              >
                Launch Zendor
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="logo"
                width={100}
                height={100}
              />
            </div>
            <span className="font-semibold text-white">Zendor</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link
              href="https://github.com/thea11ylabs/zendor"
              className="hover:text-white transition-colors"
            >
              GitHub
            </Link>
            <span>Built by developers, for developers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-700 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-violet-900/30 flex items-center justify-center text-violet-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
