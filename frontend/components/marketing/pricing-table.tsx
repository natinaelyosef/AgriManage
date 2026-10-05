"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface Tier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: string;
  yearlyPrice: string;
  unit: string;
  billedNote: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For a single farm getting organised",
    monthlyPrice: "Br 0",
    yearlyPrice: "Br 0",
    unit: "/ month",
    billedNote: "Free forever",
    features: [
      "Up to 2 farms and 6 fields",
      "Season, crop and activity planning",
      "Harvest batches with QR codes",
      "Amharic and English interface",
      "Community support",
    ],
    cta: "Start free",
    href: "/register",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For commercial farms and estates",
    monthlyPrice: "Br 12",
    yearlyPrice: "Br 10",
    unit: "/ hectare / month",
    billedNote: "Billed on cultivated hectares",
    features: [
      "Unlimited farms, fields and seasons",
      "Expenses, sales and payment verification",
      "Inventory with low-stock alerts",
      "Profitability and cash-summary reports",
      "Ethiopian calendar reporting",
      "Email support within one business day",
    ],
    cta: "Start 30-day trial",
    href: "/register",
    highlighted: true,
  },
  {
    id: "cooperative",
    name: "Cooperative",
    tagline: "For unions, cooperatives and multi-farm groups",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    unit: "pricing",
    billedNote: "Quoted per member and season",
    features: [
      "Multiple member farms under one account",
      "Roles for agronomists, accountants and workers",
      "Bulk import and partner API access",
      "Consolidated cooperative reporting",
      "Onboarding and training in Amharic",
      "Dedicated support contact",
    ],
    cta: "Talk to us",
    href: "/contact",
    highlighted: false,
  },
];

export function PricingTable() {
  const { t } = useI18n();
  const [annual, setAnnual] = useState(false);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("marketing.pricing.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          Priced in Ethiopian Birr. Start free, then pay only for the hectares you actually cultivate.
        </p>

        <div className="mt-6 inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              !annual ? "bg-brand-600 text-white" : "text-muted hover:text-foreground",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              annual ? "bg-brand-600 text-white" : "text-muted hover:text-foreground",
            )}
          >
            Yearly <span className={cn("text-[0.7rem]", annual ? "text-brand-100" : "text-success-600")}>−17%</span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "card relative flex flex-col p-6",
              tier.highlighted && "border-brand-500 shadow-pop ring-1 ring-brand-500/40",
            )}
          >
            {tier.highlighted && (
              <span className="badge absolute -top-3 left-6 border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                Most popular
              </span>
            )}
            <h2 className="text-lg font-semibold">{tier.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>

            <p className="mt-5 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {annual ? tier.yearlyPrice : tier.monthlyPrice}
              </span>
              <span className="text-sm text-muted-foreground">{tier.unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{annual && tier.id === "pro" ? "Yearly rate · " : ""}{tier.billedNote}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={cn("btn mt-6 w-full", tier.highlighted ? "btn-primary" : "btn-secondary")}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Pro plans are invoiced on cultivated hectares at the end of each month. Cancel any time.
      </p>
    </section>
  );
}
