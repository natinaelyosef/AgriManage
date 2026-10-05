import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatMoney(value: number, currency = "ETB"): string {
  const symbol = currency === "ETB" ? "Br " : currency === "USD" ? "$" : "";
  return `${symbol}${formatNumber(value, 2)}`;
}

export function formatQuantity(value: number, unit?: string): string {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 3)}${unit ? ` ${unit}` : ""}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateRelative(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 30) return `In ${days} days`;
  if (days < -1 && days > -30) return `${Math.abs(days)} days ago`;
  return formatDate(iso);
}

export const SEVERITY_STYLES: Record<string, string> = {
  INFO: "bg-info-50 text-info-600 border-info-500/30",
  WARNING: "bg-warning-50 text-warning-600 border-warning-500/30",
  CRITICAL: "bg-critical-50 text-critical-600 border-critical-500/30",
  EMERGENCY: "bg-critical-500 text-white border-critical-600",
};

export const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-50 text-success-600 border-success-500/30",
  suspended: "bg-critical-50 text-critical-600 border-critical-500/30",
  completed: "bg-success-50 text-success-600 border-success-500/30",
  verified: "bg-success-50 text-success-600 border-success-500/30",
  passed: "bg-success-50 text-success-600 border-success-500/30",
  paid: "bg-success-50 text-success-600 border-success-500/30",
  harvested: "bg-success-50 text-success-600 border-success-500/30",
  planned: "bg-info-50 text-info-600 border-info-500/30",
  growing: "bg-brand-50 text-brand-700 border-brand-500/30",
  ready: "bg-warning-50 text-warning-600 border-warning-500/30",
  pending: "bg-warning-50 text-warning-600 border-warning-500/30",
  in_progress: "bg-info-50 text-info-600 border-info-500/30",
  partial: "bg-warning-50 text-warning-600 border-warning-500/30",
  recorded: "bg-info-50 text-info-600 border-info-500/30",
  stored: "bg-earth-100 text-earth-800 border-earth-300/50",
  scheduled: "bg-info-50 text-info-600 border-info-500/30",
  maintenance: "bg-warning-50 text-warning-600 border-warning-500/30",
  retired: "bg-earth-100 text-earth-700 border-earth-300/50",
  draft: "bg-earth-100 text-earth-700 border-earth-300/50",
  submitted: "bg-info-50 text-info-600 border-info-500/30",
  sent: "bg-info-50 text-info-600 border-info-500/30",
  received: "bg-success-50 text-success-600 border-success-500/30",
  closed: "bg-earth-100 text-earth-700 border-earth-300/50",
  present: "bg-success-50 text-success-600 border-success-500/30",
  absent: "bg-critical-50 text-critical-600 border-critical-500/30",
  late: "bg-warning-50 text-warning-600 border-warning-500/30",
  half_day: "bg-info-50 text-info-600 border-info-500/30",
  leave: "bg-brand-50 text-brand-700 border-brand-500/30",
  expired: "bg-warning-50 text-warning-600 border-warning-500/30",
  terminated: "bg-critical-50 text-critical-600 border-critical-500/30",
  customs_cleared: "bg-info-50 text-info-600 border-info-500/30",
  shipped: "bg-brand-50 text-brand-700 border-brand-500/30",
  delivered: "bg-success-50 text-success-600 border-success-500/30",
  cancelled: "bg-critical-50 text-critical-600 border-critical-500/30",
  failed: "bg-critical-50 text-critical-600 border-critical-500/30",
  rejected: "bg-critical-50 text-critical-600 border-critical-500/30",
  inactive: "bg-earth-100 text-earth-700 border-earth-300/50",
};
