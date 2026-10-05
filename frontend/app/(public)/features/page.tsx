import Link from "next/link";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { CtaBand } from "@/components/marketing/sections";

export const metadata = {
  title: "Features",
  description:
    "Field mapping and QR codes, season and crop planning, activity tracking, harvest traceability, inventory alerts and verified payments — every AgriManage feature.",
};

const WORKFLOW = [
  {
    step: "01",
    title: "Map what you farm",
    body: "Register farms and fields, draw boundaries, and print the QR codes that will travel with your batches.",
  },
  {
    step: "02",
    title: "Plan the season",
    body: "Create the season, assign crops and varieties to fields, set expected yields and budgets in the calendar you use.",
  },
  {
    step: "03",
    title: "Execute and record",
    body: "Your team logs activities, labour, inputs and harvest quantities from the field — even when the phone is offline.",
  },
  {
    step: "04",
    title: "Reconcile and decide",
    body: "Expenses, sales and payments line up with the harvest, and profitability reports tell you which plot paid off.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-brand-700">
            Everything in AgriManage
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            One record for every hectare, season and birr
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Modules share the same data, so a harvest batch updates stock, a stock issue becomes an expense, and a
            verified payment lands in the same report your accountant signs off.
          </p>
        </div>
      </section>

      <FeatureGrid />

      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How a season runs in AgriManage</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
              <div key={item.step} className="card p-5">
                <p className="text-sm font-bold text-brand-700">{item.step}</p>
                <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary">
              Start free trial
            </Link>
            <Link href="/pricing" className="btn btn-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
