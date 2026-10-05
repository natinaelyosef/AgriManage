"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{ href: string; labelKey: TranslationKey }> = [
  { href: "/features", labelKey: "marketing.nav.features" },
  { href: "/pricing", labelKey: "marketing.nav.pricing" },
  { href: "/about", labelKey: "marketing.nav.about" },
  { href: "/contact", labelKey: "marketing.nav.contact" },
];

function BrandMark() {
  return (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        A
      </span>
      <span className="text-[0.95rem] font-bold tracking-tight">AgriManage</span>
    </>
  );
}

export function MarketingHeader() {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
        : "text-muted hover:bg-earth-100 hover:text-foreground dark:hover:bg-white/5",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <BrandMark />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(pathname === item.href)}>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-ghost p-2"
            onClick={() => setLocale(locale === "en" ? "am" : "en")}
            aria-label="Toggle language"
            title={locale === "en" ? "አማርኛ" : "English"}
          >
            <span className="text-xs font-bold">{locale === "en" ? "አማ" : "EN"}</span>
          </button>
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
            {t("marketing.nav.login")}
          </Link>
          <Link href="/register" className="btn btn-primary hidden sm:inline-flex">
            {t("marketing.nav.register")}
          </Link>
          <button
            type="button"
            className="btn btn-ghost p-2 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="Mobile">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(pathname === item.href)}
                onClick={() => setOpen(false)}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Link href="/login" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>
                {t("marketing.nav.login")}
              </Link>
              <Link href="/register" className="btn btn-primary flex-1" onClick={() => setOpen(false)}>
                {t("marketing.nav.register")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
