import Link from "next/link";
import { CtaBand, StatsStrip } from "@/components/marketing/sections";

export const metadata = {
  title: "About",
  description:
    "AgriManage exists to make farm records as reliable as the fields they describe — software built in and for Ethiopian agriculture.",
};

const PRINCIPLES = [
  {
    title: "Records first",
    body: "A farm that writes things down farms with less waste. AgriManage makes the record the fastest option, not the extra chore.",
  },
  {
    title: "Local by default",
    body: "Ethiopian calendar, timad and quintal, Amharic labels, mobile-money receipts. Nothing has to be translated or converted at the end of the season.",
  },
  {
    title: "Trust in the numbers",
    body: "Payments need a second pair of eyes, edits leave an audit trail, and reports show their working — so banks and partners can rely on them.",
  },
  {
    title: "Built for the field",
    body: "Large tap targets, offline-friendly forms and QR codes that survive dust, sun and a season in a jacket pocket.",
  },
];

const AUDIENCES = [
  {
    title: "Commercial farms & estates",
    body: "Multiple plots, seasonal labour and a real P&L to defend — with reports your manager and your bank both understand.",
  },
  {
    title: "Cooperatives & unions",
    body: "Many member farms in one account, with roles that let agronomists plan while accountants verify payments.",
  },
  {
    title: "Smallholders & new growers",
    body: "Start free with up to two farms, keep harvest and stock records tidy, and grow into planning and finance when the farm does.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-brand-700">About AgriManage</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Farm records should be as reliable as the fields they describe
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Ethiopian agriculture feeds more than half the country, yet most farms still run on notebooks, WhatsApp
            photos and end-of-season guesswork. We are building the system we wished existed: one place where the
            field team, the store and the office all work from the same truth.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Our mission</h2>
            <p className="mt-3 text-muted-foreground">
              To give every Ethiopian farm — from a two-hectare teff plot to a commercial estate — the operational
              clarity that large agribusinesses take for granted, in the language, calendar and units the sector
              actually uses.
            </p>
            <p className="mt-3 text-muted-foreground">
              Better records mean better decisions: which variety paid, which field drained, which buyer pays late,
              and which input is about to run out three weeks before spraying.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Who we build for</h2>
            <ul className="mt-4 space-y-4">
              {AUDIENCES.map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((item) => (
            <div key={item.title} className="card p-5">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-primary">
            Start free trial
          </Link>
          <Link href="/contact" className="btn btn-secondary">
            Talk to the team
          </Link>
        </div>
      </section>

      <StatsStrip />
      <CtaBand />
    </>
  );
}
