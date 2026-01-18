"use client";

import {
  useState,
  useCallback,
  useEffect,
  useDeferredValue,
  useMemo,
} from "react";
import { Check, Copy, Loader } from "lucide-react";
import { useAtomValue } from "jotai";
import { codeThemeAtom } from "@/stores/code-theme";
import { SHIKI_THEMES, SHIKI_LANGUAGES } from "@/lib/constants";
import { useInView } from "@/hooks/useInView";
import type { Highlighter, BundledLanguage } from "shiki";

interface Props {
  code: string;
  lang: string;
}

let highlighterPromise: Promise<Highlighter> | null = null;
let highlighterInstance: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return highlighterInstance;

  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(async ({ createHighlighter }) => {
      const h = await createHighlighter({
        themes: SHIKI_THEMES as readonly string[] as string[],
        langs: SHIKI_LANGUAGES as readonly string[] as string[],
      });
      highlighterInstance = h;
      return h;
    });
  }
  return highlighterPromise;
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="relative p-4 bg-[#0d1117] min-h-[100px]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader className="w-3 h-3 animate-spin" />
          Loading...
        </div>
      </div>
    </div>
  );
}

function CodeBlockInner({ code, lang }: Props) {
  const [copied, setCopied] = useState(false);
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  const theme = useAtomValue(codeThemeAtom);
  const deferredTheme = useDeferredValue(theme);

  // Use custom Intersection Observer hook
  const { ref, isInView } = useInView({
    threshold: 0,
    rootMargin: "50px",
    triggerOnce: true,
  });

  // Detect if theme is transitioning
  const isTransitioning = theme !== deferredTheme;

  useEffect(() => {
    let active = true;

    async function loadHighlighter() {
      try {
        const h = await getHighlighter();
        if (!active) return;
        setHighlighter(h);
      } catch (error) {
        console.error("Failed to load highlighter:", error);
      }
    }

    loadHighlighter();
    return () => {
      active = false;
    };
  }, []);

  // Generate highlighted HTML with deferred theme
  const highlightedHtml = useMemo(() => {
    if (!highlighter || !isInView) return null;

    try {
      const safeLang = (lang || "text") as BundledLanguage;
      return highlighter.codeToHtml(code, {
        lang: safeLang,
        theme: deferredTheme,
      });
    } catch (error) {
      console.error("Failed to highlight code:", error);
      return null;
    }
  }, [code, lang, deferredTheme, highlighter, isInView]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div
      ref={ref}
      className="group my-4 overflow-hidden border code-block-container code-block relative"
    >
      {/* Loading overlay during theme transition */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-10 flex items-center justify-center animate-in fade-in-0 duration-200">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Loader className="w-3 h-3 animate-spin" />
            Applying theme...
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b code-block-header">
        <span className="text-xs font-mono code-block-lang">
          {lang || "text"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 text-xs transition-colors hover:text-white code-block-button"
        >
          {copied ? (
            <>
              <Check size={12} /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>

      <div
        className={`[&_code]:font-mono [&_code]:leading-relaxed transition-opacity
           duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
      >
        {!highlighter ? (
          <LoadingSkeleton />
        ) : highlightedHtml && isInView ? (
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className="p-0 m-0 [&>pre]:rounded-none [&>pre]:m-0"
          />
        ) : (
          <pre className="p-4 m-0 bg-[#0d1117] ">
            <code className="font-mono leading-relaxed text-[#e6edf3]">
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}

export { CodeBlockInner as CodeBlock };
