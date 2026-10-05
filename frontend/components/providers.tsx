"use client";

import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/provider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
