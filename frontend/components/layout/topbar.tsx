"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Monitor,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n, type ThemePref } from "@/lib/i18n/provider";
import { useResource } from "@/lib/api/hooks";
import type { NotificationRecord } from "@/lib/api/types";
import type { Paginated } from "@/lib/api/client";
import { initials, titleCase } from "@/lib/utils";
import { SeverityBadge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { cn } from "@/lib/utils";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const { user, logout, can } = useAuth();
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: notificationsPayload } = useResource<Paginated<NotificationRecord>>(
    user ? "/notifications" : null,
    { per_page: 8 },
  );
  const notifications = notificationsPayload?.data ?? [];
  const unread = notifications.filter((item) => !item.read_at).length;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setBellOpen(false);
    };
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const themeIcon = useMemo(() => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  }, [theme]);

  const cycleTheme = () => {
    const order: ThemePref[] = ["light", "dark", "system"];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  };
  const ThemeIcon = themeIcon;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur">
      <button className="btn btn-ghost p-2 lg:hidden" onClick={onOpenMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <button
        className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-left text-sm text-muted-foreground hover:border-brand-400 sm:flex sm:max-w-md"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="truncate">{t("action.search")}…</span>
        <kbd className="ml-auto rounded border border-border bg-surface px-1.5 py-0.5 text-[0.65rem] font-medium">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          className="btn btn-ghost p-2 sm:hidden"
          onClick={() => setSearchOpen(true)}
          aria-label={t("action.search")}
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        <button
          className="btn btn-ghost p-2"
          onClick={() => setLocale(locale === "en" ? "am" : "en")}
          aria-label="Toggle language"
          title={locale === "en" ? "አማርኛ" : "English"}
        >
          <span className="text-xs font-bold">{locale === "en" ? "አማ" : "EN"}</span>
        </button>

        <button className="btn btn-ghost p-2" onClick={cycleTheme} aria-label="Toggle theme" title={titleCase(theme)}>
          <ThemeIcon className="h-4.5 w-4.5" />
        </button>

        <div className="relative" ref={bellRef}>
          <button
            className="btn btn-ghost relative p-2"
            onClick={() => setBellOpen((open) => !open)}
            aria-label={t("nav.notifications")}
          >
            <Bell className="h-4.5 w-4.5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical-500 px-1 text-[0.6rem] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card z-40 max-h-96 overflow-y-auto shadow-pop">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-sm font-semibold">{t("nav.notifications")}</p>
                <Link href="/app/notifications" className="text-xs text-brand-700 hover:underline" onClick={() => setBellOpen(false)}>
                  {t("action.viewAll")}
                </Link>
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("table.empty")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((item) => (
                    <li key={item.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium", !item.read_at && "font-semibold")}>{item.title}</p>
                        <SeverityBadge severity={item.severity} />
                      </div>
                      {item.message && <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>}
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">
                        <DateCell value={item.created_at} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            className="ml-1 flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-earth-100 dark:hover:bg-white/5"
            onClick={() => setProfileOpen((open) => !open)}
            aria-label="Account menu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {user ? initials(user.name) : "?"}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 card z-40 shadow-pop">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {user?.role && <p className="mt-1 text-xs text-brand-700">{user.role.name}</p>}
              </div>
              <div className="p-1.5">
                <Link
                  href="/app/settings"
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-earth-100 dark:hover:bg-white/5"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="h-4 w-4" /> {t("settings.profile")}
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-earth-100 dark:hover:bg-white/5"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserIcon className="h-4 w-4" /> {t("settings.organization")}
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-critical-600 hover:bg-critical-50"
                  onClick={async () => {
                    setProfileOpen(false);
                    await logout();
                    router.push("/login");
                  }}
                >
                  <LogOut className="h-4 w-4" /> {t("action.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} canViewReports={can("report.view")} />}
    </header>
  );
}

interface SearchResult {
  type: string;
  id: number;
  label: string;
  meta?: Record<string, unknown>;
  url: string;
}

function CommandPalette({ onClose, canViewReports }: { onClose: () => void; canViewReports: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, loading } = useResource<{ data: { results: SearchResult[] } }>(
    debounced.trim().length >= 2 && canViewReports ? "/search" : null,
    { q: debounced.trim() },
  );

  const results = data?.data.results ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="card relative z-10 w-full max-w-xl overflow-hidden shadow-pop">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${t("action.search")} (Ctrl K)`}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {debounced.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("form.searchPlaceholder")}</p>
          )}
          {debounced.trim().length >= 2 && loading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("table.loading")}</p>
          )}
          {debounced.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("table.noResults")}</p>
          )}
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-earth-100 dark:hover:bg-white/5"
              onClick={() => {
                onClose();
                router.push(result.url);
              }}
            >
              <span className="badge bg-brand-50 text-brand-700 border-brand-500/30">{result.type}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{result.label}</span>
                {result.meta && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {String(result.meta.code ?? result.meta.phone ?? result.meta.batch_number ?? "")}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
