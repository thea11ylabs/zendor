"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { Check, Copy } from "lucide-react";
import { useAtomValue } from "jotai";
import { codeThemeAtom } from "@/stores/code-theme";
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from "shiki";
import {
  codeToKeyedTokens,
  createMagicMoveMachine,
} from "shiki-magic-move/core";
import { ShikiMagicMovePrecompiled } from "shiki-magic-move/react";
import { SHIKI_THEMES, SHIKI_LANGUAGES } from "@/lib/constants";
import "shiki-magic-move/dist/style.css";

interface Props {
  code: string;
  lang: string;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...SHIKI_THEMES],
      langs: [...SHIKI_LANGUAGES],
    });
  }
  return highlighterPromise;
}

function CodeBlockInner({ code, lang }: Props) {
  const [copied, setCopied] = useState(false);
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  useEffect(() => {
    let active = true;

    async function loadHighlighter() {
      const h = await getHighlighter();
      if (!active) return;
      setHighlighter(h);
    }
    loadHighlighter();
    return () => {
      active = false;
    };
  }, []);
  const theme = useAtomValue(codeThemeAtom);

  type CompiledTokens = ReturnType<typeof codeToKeyedTokens>;

  // Compile tokens using codeToKeyedTokens (lighter than codeToHtml)
  const compiledTokens = useMemo<CompiledTokens | null>(() => {
    if (!highlighter) return null;
    const safeLang = (lang || "text") as BundledLanguage;
    const machine = createMagicMoveMachine((code) => {
      return codeToKeyedTokens(highlighter, code, {
        lang: safeLang,
        theme,
      });
    }, {});

    return machine.commit(code).current as CompiledTokens;
  }, [code, lang, theme, highlighter]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="group my-4 overflow-hidden border code-block-container code-block">
      <div className="flex items-center justify-between px-4 py-2 border-b code-block-header">
        <span className="text-xs font-mono code-block-lang">
          {lang || "text"}
        </span>
        <button
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
      <div className="text-sm [&>pre]:p-4 [&>pre]:m-0 [&_code]:font-mono [&_code]:leading-relaxed">
        {compiledTokens ? (
          <ShikiMagicMovePrecompiled
            steps={[compiledTokens]}
            step={0}
            options={{ duration: 100, stagger: 0 }}
          />
        ) : (
          <pre className="p-4 m-0 bg-[#0d1117]">
            <code className="font-mono leading-relaxed text-[#e6edf3]">
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}

export const CodeBlock = memo(
  CodeBlockInner,
  (prev, next) => prev.code === next.code && prev.lang === next.lang
);
