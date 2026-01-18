import { atomWithStorage, createJSONStorage } from "jotai/utils";

// Available themes (VSCode-style)
export const CODE_THEMES = [
  { id: "github-dark-high-contrast", name: "GitHub Dark High Contrast" },
  { id: "github-dark", name: "GitHub Dark" },
  { id: "github-dark-dimmed", name: "GitHub Dimmed" },
  { id: "dark-plus", name: "Dark+" },
  { id: "vitesse-dark", name: "Vitesse Dark" },
  { id: "one-dark-pro", name: "One Dark Pro" },
  { id: "dracula", name: "Dracula" },
  { id: "nord", name: "Nord" },
  { id: "tokyo-night", name: "Tokyo Night" },
  { id: "catppuccin-mocha", name: "Catppuccin" },
  { id: "material-theme-darker", name: "Material Dark" },
  { id: "ayu-dark", name: "Ayu Dark" },
  { id: "night-owl", name: "Night Owl" },
  { id: "poimandres", name: "Poimandres" },
  { id: "monokai", name: "Monokai" },
  { id: "slack-dark", name: "Slack Dark" },
  { id: "synthwave-84", name: "Synthwave '84" },
  { id: "rose-pine-moon", name: "Rosé Pine Moon" },
  { id: "houston", name: "Houston" },
  { id: "aurora-x", name: "Aurora X" },
  { id: "everforest-dark", name: "Everforest" },
] as const;

export type CodeThemeId = (typeof CODE_THEMES)[number]["id"];

const DEFAULT_THEME: CodeThemeId = "github-dark-high-contrast";

const codeThemeStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<CodeThemeId>(() => localStorage);

export const codeThemeAtom = atomWithStorage<CodeThemeId>(
  "code-theme",
  DEFAULT_THEME,
  codeThemeStorage,
  { getOnInit: true }
);
