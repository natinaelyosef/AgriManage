import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata = {
  title: "Contact",
  description:
    "Questions about AgriManage — pricing, implementation or support? Send us a message and we will reply within one business day.",
};

const DETAILS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@agrimanage.et",
    href: "mailto:hello@agrimanage.et",
    note: "Best for pricing, demos and partnerships.",
  },
  {
    icon: Mail,
    label: "Support",
    value: "support@agrimanage.et",
    href: "mailto:support@agrimanage.et",
    note: "Existing customers — include your organization name.",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+251 11 000 0000",
    href: null,
    note: "Monday to Friday, 9:00 – 18:00 (EAT).",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Addis Ababa, Ethiopia",
    href: null,
    note: "Visits by appointment.",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-brand-700">Contact</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Tell us about your farm
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Whether you are moving off spreadsheets or rolling AgriManage out to a cooperative, a real person will
            read your message and reply within one business day.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" /> Other ways to reach us
              </h2>
              <ul className="mt-4 space-y-4">
                {DETAILS.map((detail) => {
                  const Icon = detail.icon;
                  return (
                    <li key={detail.label} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {detail.label}
                        </p>
                        {detail.href ? (
                          <a href={detail.href} className="text-sm font-semibold text-brand-700 hover:underline">
                            {detail.value}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold">{detail.value}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">{detail.note}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="text-base font-semibold">What happens next</h2>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1.</span> We read your message and reply by email.
                </li>
                <li>
                  <span className="font-semibold text-foreground">2.</span> If it is a fit, we book a 30-minute walkthrough
                  of your farms.
                </li>
                <li>
                  <span className="font-semibold text-foreground">3.</span> You get a trial workspace with your own data
                  loaded.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
