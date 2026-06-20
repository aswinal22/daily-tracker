"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Theme } from "@/types";

const STORAGE_KEY = "dtd-theme";

/**
 * Applies the user's theme preference as early as possible to avoid FOUC.
 * Inline script set in <head> reads localStorage + falls back to system pref.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

/** Toggle the theme and persist it. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle("dark", t === "dark");

    // Best-effort: sync to server profile
    void createClient()
      .from("profiles")
      .update({ theme: t })
      .then(() => {});
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle, mounted };
}

export { STORAGE_KEY as THEME_STORAGE_KEY };
