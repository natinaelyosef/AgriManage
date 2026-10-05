import Link from "next/link";
import { PricingTable } from "@/components/marketing/pricing-table";
import { CtaBand } from "@/components/marketing/sections";

export const metadata = {
  title: "Pricing",
  description:
    "Simple pricing in Ethiopian Birr — free for up to 2 farms, a per-hectare Pro plan, and custom pricing for cooperatives.",
};

const FAQ = [
  {
    q: "What exactly is a hectare billed on?",
    a: "The Pro plan is invoiced on the hectares you actually cultivate in the month, not the total area you own. Fallow plots and grazing land are free.",
  },
  {
    q: "Can I pay with Telebirr or CBE Birr?",
    a: "Yes. Invoices can be settled by mobile money or bank transfer. Send the receipt through the app and it is recorded as a pending payment until it is verified.",
  },
  {
    q: "Is there a limit on users?",
    a: "No. Invite your agronomist, storekeepers, accountants and field workers at no extra cost — you control what each role can see.",
  },
  {
    q: "What happens after the trial?",
    a: "Your data stays. You can move to Pro, stay on Free for up to 2 farms, or export everything to CSV at any time.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PricingTable />

      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Questions we hear often</h2>
          <dl className="mt-6 space-y-5">
            {FAQ.map((item) => (
              <div key={item.q} className="card p-5">
                <dt className="text-sm font-semibold">{item.q}</dt>
                <dd className="mt-1.5 text-sm text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            Still deciding? <Link href="/contact" className="font-semibold text-brand-700 hover:underline">Talk to us</Link> — we will
            walk through your farms and suggest a plan.
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
