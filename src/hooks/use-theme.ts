import { useCallback, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, setStoredTheme, type ThemeMode } from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof window === "undefined" ? "dark" : getStoredTheme(),
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setStoredTheme(mode);
    setThemeState(mode);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, isDark: theme === "dark" };
}
