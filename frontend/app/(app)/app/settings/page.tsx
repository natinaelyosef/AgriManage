"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe, Languages, LogOut, Moon, Monitor, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useI18n,
  type ThemePref,
  type TranslationKey,
} from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/skeleton";
import { cn, titleCase } from "@/lib/utils";

const THEME_LABELS: Record<ThemePref, TranslationKey> = {
  light: "settings.theme.light",
  dark: "settings.theme.dark",
  system: "settings.theme.system",
};

const THEME_ICONS: Record<ThemePref, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
          : "border-border text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function SettingsContent() {
  const { t, locale, setLocale, calendar, setCalendar, theme, setTheme } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="card">
        <EmptyState title={t("common.loading")} />
      </div>
    );
  }

  const organization = user.organization;

  return (
    <div>
      <PageHeader title={t("nav.settings")} subtitle="Your profile, appearance and active session" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-4 w-4 text-muted-foreground" /> {t("settings.profile")}
          </h2>
          <dl className="mt-3 divide-y divide-border">
            <DetailRow label={t("auth.name")} value={user.name} />
            <DetailRow label={t("auth.email")} value={user.email} />
            <DetailRow label={t("auth.phone")} value={user.phone ?? "—"} />
            <DetailRow label="Role" value={user.role?.name ?? "—"} />
            <DetailRow label={t("settings.organization")} value={organization?.name ?? "—"} />
          </dl>
          <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Contact your organization owner to change these details — profile fields are managed centrally so records
            stay consistent.
          </p>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Globe className="h-4 w-4 text-muted-foreground" /> {t("settings.organization")}
          </h2>
          {organization ? (
            <dl className="mt-3 divide-y divide-border">
              <DetailRow label={t("common.name")} value={organization.name} />
              <DetailRow label={t("common.type")} value={titleCase(organization.type)} />
              <DetailRow label="Plan" value={titleCase(organization.plan)} />
              <DetailRow label={t("auth.region")} value={organization.region ?? "—"} />
              <DetailRow label="Currency" value={organization.currency} />
              <DetailRow label={t("settings.language")} value={organization.locale.toUpperCase()} />
              <DetailRow label={t("settings.calendar")} value={titleCase(organization.calendar)} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No organization linked to this account.</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold">Appearance</h2>

          <div className="mt-4">
            <p className="label flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" /> {t("settings.language")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Choice active={locale === "en"} onClick={() => setLocale("en")}>
                English
              </Choice>
              <Choice active={locale === "am"} onClick={() => setLocale("am")}>
                አማርኛ
              </Choice>
            </div>
          </div>

          <div className="mt-4">
            <p className="label">{t("settings.calendar")}</p>
            <div className="flex flex-wrap gap-2">
              <Choice
                active={calendar === "ethiopian"}
                onClick={() => setCalendar("ethiopian")}
              >
                Ethiopian
              </Choice>
              <Choice
                active={calendar === "gregorian"}
                onClick={() => setCalendar("gregorian")}
              >
                Gregorian
              </Choice>
            </div>
          </div>

          <div className="mt-4">
            <p className="label">{t("settings.theme")}</p>
            <div className="flex flex-wrap gap-2">
              {(["light", "dark", "system"] as ThemePref[]).map((option) => {
                const Icon = THEME_ICONS[option];
                return (
                  <Choice key={option} active={theme === option} onClick={() => setTheme(option)}>
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4" /> {t(THEME_LABELS[option])}
                    </span>
                  </Choice>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <LogOut className="h-4 w-4 text-muted-foreground" /> Session
          </h2>
          <dl className="mt-3 divide-y divide-border">
            <DetailRow label={t("auth.email")} value={user.email} />
            <DetailRow label="Role" value={user.role?.name ?? "—"} />
            <DetailRow label="Last sign-in" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-GB") : "—"} />
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Signing out ends this session on this device. Unsaved forms will be lost.
            </p>
            <Button
              variant="danger"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4" /> {t("action.logout")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
