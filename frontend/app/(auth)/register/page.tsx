"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type RegisterPayload } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";

const ORG_TYPES: Array<{ value: string; label: string }> = [
  { value: "cooperative", label: "Cooperative" },
  { value: "estate", label: "Estate / Commercial farm" },
  { value: "smallholder", label: "Smallholder" },
  { value: "outgrower", label: "Outgrower scheme" },
  { value: "research", label: "Research station" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const toast = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    orgName: "",
    orgType: "cooperative",
    region: "",
  });
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);
    const payload: RegisterPayload = {
      organization: {
        name: form.orgName,
        type: form.orgType,
        region: form.region || undefined,
        phone: form.phone || undefined,
      },
      user: {
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        phone: form.phone || undefined,
      },
    };
    try {
      await register(payload);
      toast.success("Organization created");
      router.replace("/app");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.details ?? {});
        setFormError(error.message);
      } else {
        setFormError(t("form.error"));
      }
    } finally {
      setPending(false);
    }
  };

  const errorFor = (key: string) => errors[key]?.[0];
  const nestedError = (group: string, key: string) =>
    errors[`${group}.${key}`]?.[0] ?? errors[`${group}.${key}`]?.[0];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">
              A
            </span>
            <span className="text-lg font-bold tracking-tight">AgriManage</span>
          </Link>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setLocale(locale === "en" ? "am" : "en")}
          >
            {locale === "en" ? "አማርኛ" : "English"}
          </button>
        </div>

        <div className="card p-6 sm:p-7">
          <h1 className="text-xl font-bold">{t("auth.register.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>

          {formError && (
            <div className="mt-4 rounded-lg border border-critical-500/30 bg-critical-50 px-3 py-2 text-sm text-critical-600">
              {formError}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label={t("auth.orgName")} htmlFor="orgName" required error={nestedError("organization", "name")}>
              <Input id="orgName" required value={form.orgName} onChange={set("orgName")} placeholder="Demo Teff Farm" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("auth.orgType")} htmlFor="orgType">
                <Select id="orgType" value={form.orgType} onChange={set("orgType")}>
                  {ORG_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("auth.region")} htmlFor="region">
                <Input id="region" value={form.region} onChange={set("region")} placeholder="Oromia" />
              </Field>
            </div>

            <Field label={t("auth.name")} htmlFor="name" required error={nestedError("user", "name") ?? errorFor("name")}>
              <Input id="name" autoComplete="name" required value={form.name} onChange={set("name")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("auth.email")} htmlFor="email" required error={nestedError("user", "email") ?? errorFor("email")}>
                <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
              </Field>
              <Field label={t("auth.phone")} htmlFor="phone">
                <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="+251…" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("auth.password")} htmlFor="password" required error={nestedError("user", "password") ?? errorFor("password")}>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={set("password")}
                />
              </Field>
              <Field
                label={t("auth.passwordConfirm")}
                htmlFor="password_confirmation"
                required
                error={errorFor("password_confirmation")}
              >
                <Input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password_confirmation}
                  onChange={set("password_confirmation")}
                />
              </Field>
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={pending}>
              {t("action.register")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">
              {t("action.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
