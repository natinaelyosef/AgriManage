"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";

function LoginForm() {
  const { login } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      await login(email, password);
      toast.success(`Welcome back`);
      router.replace(next);
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

  return (
    <div className="w-full max-w-md">
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
        <h1 className="text-xl font-bold">{t("auth.login.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>

        {formError && (
          <div className="mt-4 rounded-lg border border-critical-500/30 bg-critical-50 px-3 py-2 text-sm text-critical-600">
            {formError}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <Field label={t("auth.email")} htmlFor="email" error={errors.email?.[0]}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@demo-teff-farm.test"
            />
          </Field>
          <Field label={t("auth.password")} htmlFor="password" error={errors.password?.[0]}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" variant="primary" className="w-full" loading={pending}>
            {t("action.signIn")}
          </Button>
        </form>

        <p className="mt-4 rounded-lg bg-background px-3 py-2 text-center text-xs text-muted-foreground">
          {t("auth.demoHint")}
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            {t("action.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
