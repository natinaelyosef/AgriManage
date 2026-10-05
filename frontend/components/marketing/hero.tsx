"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

const PREVIEW_KPIS = [
  { label: "Farms", value: "12" },
  { label: "Hectares", value: "1,486" },
  { label: "Active plans", value: "38" },
  { label: "Profit", value: "Br 618,660" },
];

const PREVIEW_ROWS = [
  { name: "Robe Valley Farm", meta: "Teff · Meskerem", value: "Br 705,600" },
  { name: "Arsi Ridge Block 3", meta: "Wheat · Tikimt", value: "Br 284,150" },
  { name: "Harvest batch HB-0294", meta: "Grade A · 92 qtl", value: "Br 138,000" },
];

const PREVIEW_BARS = [42, 64, 36, 78, 55, 88, 66, 49];

function ProductPreview() {
  return (
    <div className="card mx-auto max-w-4xl overflow-hidden shadow-pop">
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-critical-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success-500/60" />
        <span className="ml-2 truncate rounded-md border border-border bg-surface px-2 py-0.5 text-[0.68rem] text-muted-foreground">
          app.agrimanage.et/app
        </span>
      </div>

      <div className="flex">
        <div className="hidden w-44 shrink-0 space-y-2 border-r border-border bg-background p-3 sm:block">
          {["Dashboard", "Farms", "Crop plans", "Harvest", "Inventory", "Reports"].map((item, index) => (
            <div
              key={item}
              className={
                index === 5
                  ? "flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-2 text-[0.72rem] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-medium text-muted"
              }
            >
              <span
                className={
                  index === 5
                    ? "h-2 w-2 rounded-full bg-brand-500"
                    : "h-2 w-2 rounded-full bg-earth-300 dark:bg-white/20"
                }
              />
              {item}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PREVIEW_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-1 truncate text-sm font-bold tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold">Revenue vs expenses</p>
              <span className="text-[0.62rem] text-muted-foreground">Meskerem → Ginbot</span>
            </div>
            <div className="mt-3 flex h-28 items-end gap-1.5">
              {PREVIEW_BARS.map((height, index) => (
                <div key={index} className="flex flex-1 items-end gap-0.5">
                  <div className="flex-1 rounded-t-sm bg-brand-500" style={{ height: `${height}%` }} />
                  <div className="flex-1 rounded-t-sm bg-warning-500/80" style={{ height: `${Math.max(18, height - 26)}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            {PREVIEW_ROWS.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.72rem] font-medium">{row.name}</p>
                  <p className="truncate text-[0.65rem] text-muted-foreground">{row.meta}</p>
                </div>
                <p className="shrink-0 text-[0.72rem] font-semibold tabular-nums">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingHero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-900/40"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="badge border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            Built for Ethiopian agriculture
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">{t("marketing.hero.title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("marketing.hero.subtitle")}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn btn-primary text-sm">
              {t("marketing.hero.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn btn-secondary text-sm">
              {t("marketing.hero.secondary")}
            </Link>
          </div>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-success-600" /> 30-day trial
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-success-600" /> No credit card
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-success-600" /> Amharic &amp; English
            </span>
          </p>
        </div>

        <div className="mt-12">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
