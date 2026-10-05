import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card p-4 space-y-3" aria-busy>
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-3.5 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon}
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted-foreground max-w-sm">{hint}</p>}
      {action}
    </div>
  );
}
