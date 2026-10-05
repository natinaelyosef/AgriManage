"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { am, en, type Dictionary, type TranslationKey } from "@/lib/i18n/dictionaries";

export type { TranslationKey };

export type Locale = "en" | "am";
export type CalendarPref = "ethiopian" | "gregorian";
export type ThemePref = "light" | "dark" | "system";

interface I18nContextValue {
  locale: Locale;
  calendar: CalendarPref;
  theme: ThemePref;
  setLocale: (locale: Locale) => void;
  setCalendar: (calendar: CalendarPref) => void;
  setTheme: (theme: ThemePref) => void;
  t: (key: TranslationKey) => string;
}

const dictionaries: Record<Locale, Dictionary> = { en, am };

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const LOCALE_KEY = "agrimanage.locale";
const CALENDAR_KEY = "agrimanage.calendar";
const THEME_KEY = "agrimanage.theme";

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return (window.localStorage.getItem(key) as T | null) ?? fallback;
}

function applyTheme(theme: ThemePref) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStored<Locale>(LOCALE_KEY, "en"));
  const [calendar, setCalendarState] = useState<CalendarPref>(() => readStored<CalendarPref>(CALENDAR_KEY, "ethiopian"));
  const [theme, setThemeState] = useState<ThemePref>(() => readStored<ThemePref>(THEME_KEY, "light"));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_KEY, next);
  }, []);

  const setCalendar = useCallback((next: CalendarPref) => {
    setCalendarState(next);
    window.localStorage.setItem(CALENDAR_KEY, next);
  }, []);

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, calendar, theme, setLocale, setCalendar, setTheme, t }),
    [locale, calendar, theme, setLocale, setCalendar, setTheme, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}
