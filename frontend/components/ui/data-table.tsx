"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle,
  emptyHint,
  emptyAction,
  onRowClick,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  caption?: string;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-border" aria-busy>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold">{emptyTitle ?? "No records yet"}</p>
        {emptyHint && <p className="text-sm text-muted-foreground max-w-sm">{emptyHint}</p>}
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn(column.align === "right" && "text-right", column.className)} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn(column.align === "right" && "text-right", column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  total,
  onPageChange,
  label = "Page",
}: {
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (lastPage <= 1) {
    return (
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          {total} rows
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
      <span className="text-xs text-muted-foreground">
        {label} {page} / {lastPage} · {total} rows
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
