"use client";

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  editorTheme: Theme;
  previewTheme: Theme;
  uiTheme: Theme;
  toggleEditorTheme: () => void;
  togglePreviewTheme: () => void;
  setEditorTheme: (theme: Theme) => void;
  setPreviewTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const EDITOR_THEME_KEY = "zendor-editor-theme";
const PREVIEW_THEME_KEY = "zendor-preview-theme";

function getDefaultTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredEditorTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(EDITOR_THEME_KEY) as Theme) || getDefaultTheme();
}

function getStoredPreviewTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(PREVIEW_THEME_KEY) as Theme) || getDefaultTheme();
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialEditorTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredEditorTheme,
    () => "dark" as Theme
  );

  const initialPreviewTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredPreviewTheme,
    () => "dark" as Theme
  );

  const [editorTheme, setEditorThemeState] = useState<Theme>(initialEditorTheme);
  const [previewTheme, setPreviewThemeState] = useState<Theme>(initialPreviewTheme);

  // Compute UI theme from panel themes
  const uiTheme: Theme = editorTheme === "dark" || previewTheme === "dark" ? "dark" : "light";

  // Apply UI theme to document for toolbar styling
  useEffect(() => {
    const root = document.documentElement;
    if (uiTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [uiTheme]);

  // Save editor theme to localStorage
  useEffect(() => {
    localStorage.setItem(EDITOR_THEME_KEY, editorTheme);
  }, [editorTheme]);

  // Save preview theme to localStorage
  useEffect(() => {
    localStorage.setItem(PREVIEW_THEME_KEY, previewTheme);
  }, [previewTheme]);

  const setEditorTheme = useCallback((theme: Theme) => {
    setEditorThemeState(theme);
  }, []);

  const setPreviewTheme = useCallback((theme: Theme) => {
    setPreviewThemeState(theme);
  }, []);

  const toggleEditorTheme = useCallback(() => {
    setEditorThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const togglePreviewTheme = useCallback(() => {
    setPreviewThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        editorTheme,
        previewTheme,
        uiTheme,
        toggleEditorTheme,
        togglePreviewTheme,
        setEditorTheme,
        setPreviewTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
