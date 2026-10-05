"use client";

import { AlertCircle } from "lucide-react";
import type { ApiError } from "@/lib/api/client";

export function ApiErrorBanner({ error }: { error?: ApiError | null }) {
  if (!error) return null;
  const messages = [
    error.message,
    ...Object.entries(error.details ?? {}).flatMap(([field, list]) =>
      list.map((message) => `${field.replace(/\./g, " ")}: ${message}`),
    ),
  ];
  return (
    <div className="mb-4 rounded-lg border border-critical-500/30 bg-critical-50 px-3 py-2.5 text-sm text-critical-600">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-0.5">
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Flattens Laravel validation errors to "field.first message". */
export function fieldError(error: ApiError | null | undefined, ...keys: string[]): string | undefined {
  if (!error?.details) return undefined;
  for (const key of keys) {
    const messages = error.details[key];
    if (messages && messages.length > 0) return messages[0];
  }
  return undefined;
}
