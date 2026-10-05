import Link from "next/link";
import { ArrowRight, CalendarDays, Languages, Scale, Smartphone } from "lucide-react";

const ETHIOPIA_HIGHLIGHTS = [
  {
    icon: Scale,
    title: "Timad & quintal units",
    body: "Work in the units your team already uses — timad, quintal, gurz and hectare — converted consistently across harvests, stock and sales.",
  },
  {
    icon: CalendarDays,
    title: "Ethiopian calendar",
    body: "Seasons, activities and reports can be shown in the Ethiopian calendar (Meskerem → Sene) or Gregorian, per user preference.",
  },
  {
    icon: Smartphone,
    title: "Telebirr & CBE Birr",
    body: "Log mobile-money and bank receipts as they happen. Payments stay pending until a second person verifies them.",
  },
  {
    icon: Languages,
    title: "Amharic interface",
    body: "The whole application is translated into Amharic, with English available for reports shared with partners and banks.",
  },
];

const STATS = [
  { value: "18,400", label: "Hectares under management" },
  { value: "1.2M", label: "Quintal of harvest recorded" },
  { value: "6,800", label: "Farm workers coordinated" },
  { value: "11", label: "Regions represented" },
];

export function EthiopiaBand() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-brand-700">Made in Ethiopia</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Built around how farms here actually work
          </h2>
          <p className="mt-3 text-muted-foreground">
            No unit conversions at midnight, no calendar exports, no receipts lost between the field and the office.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ETHIOPIA_HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function StatsStrip() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center sm:text-left">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-brand-700">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="border-t border-border bg-brand-700 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Start with your next season</h2>
          <p className="mt-2 text-sm text-brand-100">
            Set up farms, fields and a crop plan in an afternoon. Invite your agronomist, storekeeper and accountant
            when you are ready.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="btn bg-white text-brand-700 hover:bg-brand-50"
          >
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="btn border border-white/40 bg-transparent text-white hover:bg-white/10">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
