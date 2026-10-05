"use client";

import { CalendarRange, ClipboardList, Package, QrCode, Wallet, Wheat } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

const FEATURES = [
  {
    icon: QrCode,
    title: "Field mapping & QR codes",
    body: "Draw field boundaries, register farms and plots, and print QR codes that link every bag, batch and register to the field it came from.",
  },
  {
    icon: CalendarRange,
    title: "Season & crop planning",
    body: "Plan seasons in the Ethiopian or Gregorian calendar, assign crops and varieties to fields, and track expected versus actual yield.",
  },
  {
    icon: ClipboardList,
    title: "Activity tracking",
    body: "Schedule land preparation, sowing, fertilising, spraying and harvesting. Assign workers, log labour hours and see what is overdue.",
  },
  {
    icon: Wheat,
    title: "Harvest & traceability",
    body: "Record harvest batches with grade, moisture and quantity in quintal, then follow any batch from field to customer.",
  },
  {
    icon: Package,
    title: "Inventory & stock alerts",
    body: "Track seed, fertiliser, fuel and chemicals by warehouse. Low-stock alerts fire before you run out mid-season.",
  },
  {
    icon: Wallet,
    title: "Finance & manual payment verification",
    body: "Record expenses, sales and Telebirr or CBE Birr receipts. Every manual payment is verified by an accountant before it counts.",
  },
];

export function FeatureGrid() {
  const { t } = useI18n();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-brand-700">
          {t("marketing.nav.features")}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("marketing.features.title")}</h2>
        <p className="mt-3 text-muted-foreground">
          One system for the field team, the storekeeper and the accountant — no spreadsheets to reconcile at the end
          of the season.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="card p-5 transition-shadow hover:shadow-pop">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
