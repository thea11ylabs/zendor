"use client";

import { useState } from "react";
import { ChevronDown, Palette } from "lucide-react";
import { useAtom } from "jotai";
import { codeThemeAtom, CODE_THEMES } from "@/stores/code-theme";

export function CodeThemeSelector() {
  const [theme, setTheme] = useAtom(codeThemeAtom);
  const [open, setOpen] = useState(false);

  const currentTheme = CODE_THEMES.find((t) => t.id === theme);
  if (!currentTheme) {
    console.error(
      `CodeThemeSelector: Theme "${theme}" not found in CODE_THEMES`
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-md transition-colors"
      >
        <Palette className="size-4" />
        <span className="hidden sm:inline">{currentTheme?.name || theme}</span>
        <ChevronDown className="size-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-background-secondary border border-border rounded-lg shadow-xl py-1 min-w-[180px] max-h-[320px] overflow-y-auto">
            <div className="px-3 py-2 text-xs text-foreground-muted border-b border-border mb-1">
              Code Theme
            </div>
            {CODE_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  theme === t.id
                    ? "text-foreground bg-background-hover"
                    : "text-foreground-secondary hover:bg-background-hover hover:text-foreground"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
