"use client";

import { useState } from "react";
import { CircleCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

const EMPTY = { name: "", email: "", phone: "", topic: "general", message: "" };

export function ContactForm() {
  const [form, setForm] = useState(() => EMPTY);
  const [sent, setSent] = useState(false);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  if (sent) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
          <CircleCheck className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-semibold">Thanks — your message is on its way</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We read every message and usually reply within one business day, Addis Ababa time. For anything urgent, call
          the number on this page.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setForm(EMPTY);
            setSent(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="c-name" required>
          <Input id="c-name" required autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Email" htmlFor="c-email" required>
          <Input id="c-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone (optional)" htmlFor="c-phone">
          <Input id="c-phone" type="tel" autoComplete="tel" placeholder="+251 …" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Topic" htmlFor="c-topic">
          <Select id="c-topic" value={form.topic} onChange={set("topic")}>
            <option value="general">General question</option>
            <option value="pricing">Pricing &amp; demo</option>
            <option value="implementation">Implementation &amp; training</option>
            <option value="support">Support</option>
          </Select>
        </Field>
        <Field label="Message" htmlFor="c-message" required className="sm:col-span-2">
          <Textarea
            id="c-message"
            required
            rows={6}
            placeholder="Tell us about your farms, your team and what you are trying to track."
            value={form.message}
            onChange={set("message")}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">We only use these details to reply to you.</p>
        <Button type="submit" variant="primary">
          <Send className="h-4 w-4" /> Send message
        </Button>
      </div>
    </form>
  );
}
