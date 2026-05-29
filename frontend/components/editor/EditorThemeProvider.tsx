"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type EditorTheme = "dark" | "light";

type ThemeContextValue = {
  theme: EditorTheme;
  setTheme: (theme: EditorTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "lessgame-editor-theme";

export function EditorThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<EditorTheme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as EditorTheme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.editorTheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: EditorTheme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useEditorTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useEditorTheme must be used within EditorThemeProvider");
  return ctx;
}
