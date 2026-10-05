"use client";

import { formatDateByCalendar } from "@/lib/calendar";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney, formatNumber, formatQuantity, titleCase } from "@/lib/utils";

export function Money({
  value,
  currency = "ETB",
  className,
  signed = false,
}: {
  value: number;
  currency?: string;
  className?: string;
  signed?: boolean;
}) {
  const prefix = signed ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const formatted = formatMoney(Math.abs(value), currency);
  return (
    <span className={className}>
      {prefix}
      {prefix ? formatted : formatMoney(value, currency)}
    </span>
  );
}

export function Quantity({
  value,
  unit,
  className,
}: {
  value: number;
  unit?: string;
  className?: string;
}) {
  return <span className={className}>{formatQuantity(value, unit)}</span>;
}

export function Area({ value, unit = "ha" }: { value: number; unit?: string }) {
  return (
    <span>
      {formatNumber(value, value % 1 === 0 ? 0 : 2)} {unit}
    </span>
  );
}

/** Renders an ISO date honoring the tenant's calendar preference. */
export function DateCell({ value, fallback = "—" }: { value?: string | null; fallback?: string }) {
  const { calendar, locale } = useI18n();
  if (!value) return <>{fallback}</>;
  return <>{formatDateByCalendar(value, calendar, locale)}</>;
}

export function StatusText({ status }: { status: string }) {
  return <>{titleCase(status)}</>;
}
