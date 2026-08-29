"use client";

import * as React from "react";
import { isTheme, THEME_STORAGE_KEY, type ResolvedTheme, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  /** What the user chose, including "system". */
  theme: Theme;
  /** What "system" currently resolves to, meaning what is actually on screen. */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

/*
  The preference lives in localStorage and the system setting lives in
  matchMedia. Both are external stores, so they are read through
  useSyncExternalStore rather than mirrored into state inside an effect.
*/

const preferenceListeners = new Set<() => void>();

function notifyPreferenceChanged() {
  for (const listener of preferenceListeners) listener();
}

function subscribePreference(onChange: () => void) {
  preferenceListeners.add(onChange);
  // Another tab writing the preference should update this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getPreference(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

let darkQuery: MediaQueryList | null = null;
function getDarkQuery(): MediaQueryList {
  darkQuery ??= window.matchMedia(DARK_QUERY);
  return darkQuery;
}

function subscribeSystem(onChange: () => void) {
  const media = getDarkQuery();
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The server has no way to know either value; it renders the light default. */
const serverPreference = (): Theme => "system";
const serverSystemDark = () => false;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribePreference,
    getPreference,
    serverPreference,
  );
  const systemDark = React.useSyncExternalStore(
    subscribeSystem,
    () => getDarkQuery().matches,
    serverSystemDark,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Pushing the resolved theme onto the document is the one genuine side
  // effect here. The inline script in <head> has already done this for the
  // first paint; this keeps it correct on every change afterwards.
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    // Keeps native controls, scrollbars and form widgets in step with the page.
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private browsing), so the choice just won't persist.
    }
    notifyPreferenceChanged();
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
