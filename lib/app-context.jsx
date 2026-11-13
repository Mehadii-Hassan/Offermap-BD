"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { text } from "./text";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("en");

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("om-theme");
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
      const savedLang = localStorage.getItem("om-lang");
      if (savedLang === "en" || savedLang === "bn") setLang(savedLang);
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("om-theme", theme);
    } catch (e) {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("om-lang", lang);
    } catch (e) {
      /* ignore */
    }
  }, [lang]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    []
  );
  const toggleLang = useCallback(
    () => setLang((l) => (l === "en" ? "bn" : "en")),
    []
  );

  const value = useMemo(
    () => ({
      theme,
      lang,
      t: text[lang] || text.en,
      toggleTheme,
      toggleLang,
    }),
    [theme, lang, toggleTheme, toggleLang]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}