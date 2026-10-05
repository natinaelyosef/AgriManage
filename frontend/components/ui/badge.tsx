import { cn, SEVERITY_STYLES, STATUS_STYLES, titleCase } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "success" | "warning" | "critical" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-earth-100 text-earth-800 border-earth-300/50",
    brand: "bg-brand-50 text-brand-700 border-brand-500/30",
    success: "bg-success-50 text-success-600 border-success-500/30",
    warning: "bg-warning-50 text-warning-600 border-warning-500/30",
    critical: "bg-critical-50 text-critical-600 border-critical-500/30",
    info: "bg-info-50 text-info-600 border-info-500/30",
  };
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("badge", STATUS_STYLES[status] ?? STATUS_STYLES.inactive)}>
      {label ?? titleCase(status)}
    </span>
  );
}

export function SeverityBadge({ severity, label }: { severity: string; label?: string }) {
  return (
    <span className={cn("badge", SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.INFO)}>
      {label ?? titleCase(severity)}
    </span>
  );
}
