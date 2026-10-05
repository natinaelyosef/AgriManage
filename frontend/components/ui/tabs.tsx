"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 border-b border-border overflow-x-auto", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={active === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "relative px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            active === item.id
              ? "text-brand-700 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand-600"
              : "text-muted hover:text-foreground",
          )}
        >
          {item.label}
          {typeof item.count === "number" && (
            <span className="ml-1.5 rounded-full bg-earth-100 px-1.5 py-0.5 text-[0.7rem] text-earth-700">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
