"use client";

import { ChevronDown, Palette } from "lucide-react";
import { useAtom } from "jotai";
import { codeThemeAtom, CODE_THEMES } from "@/stores/code-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CodeThemeSelector() {
  const [theme, setTheme] = useAtom(codeThemeAtom);

  const currentTheme = CODE_THEMES.find((t) => t.id === theme);
  if (!currentTheme) {
    console.error(
      `CodeThemeSelector: Theme "${theme}" not found in CODE_THEMES`
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-md transition-colors"
        >
          <Palette className="size-4" />
          <span className="hidden sm:inline">
            {currentTheme?.name || theme}
          </span>
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] max-h-[320px]">
        <DropdownMenuLabel>Code Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as typeof theme)}
        >
          {CODE_THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id}>
              {t.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
