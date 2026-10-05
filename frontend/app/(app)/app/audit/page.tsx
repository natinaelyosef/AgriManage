"use client";

import { Suspense, useState } from "react";
import { Eye, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated } from "@/lib/api/hooks";
import type { AuditLogRecord } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { ListToolbar, useDebouncedSearch } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { EmptyState } from "@/components/ui/skeleton";
import { ApiErrorBanner } from "@/components/ui/form";
import { titleCase } from "@/lib/utils";

const RESOURCE_TYPES = [
  "Farm",
  "Field",
  "Season",
  "Crop",
  "CropPlan",
  "Activity",
  "HarvestBatch",
  "Worker",
  "InventoryItem",
  "Customer",
  "Expense",
  "Sale",
  "Payment",
];

function actionTone(action: string): "neutral" | "brand" | "success" | "warning" | "critical" | "info" {
  const value = action.toLowerCase();
  if (value.includes("delet")) return "critical";
  if (value.includes("creat") || value.includes("regist")) return "success";
  if (value.includes("updat") || value.includes("edit") || value.includes("chang")) return "info";
  if (value.includes("login") || value.includes("logout") || value.includes("verif")) return "brand";
  if (value.includes("reject") || value.includes("fail")) return "warning";
  return "neutral";
}

function pretty(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function AuditContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const list = useListQuery({ sort: "-created_at", filters: ["resource_type"], perPage: 15 });
  const [search, onSearchChange] = useDebouncedSearch(list.set);
  const [viewing, setViewing] = useState<AuditLogRecord | null>(null);

  const { items, meta, loading, error } = usePaginated<AuditLogRecord>("/audit-logs", list.params);

  if (!can("audit.view")) {
    return (
      <div className="card">
        <EmptyState
          title={t("common.unauthorized")}
          hint="Audit history is limited to owners and managers."
          icon={<Lock className="h-8 w-8 text-muted-foreground" aria-hidden />}
        />
      </div>
    );
  }

  const columns: Column<AuditLogRecord>[] = [
    {
      key: "created_at",
      header: t("common.date"),
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          <DateCell value={row.created_at} />
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => (
        <span className="text-sm font-medium">{row.actor_name ?? <span className="text-muted-foreground">System</span>}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => <Badge tone={actionTone(row.action)}>{titleCase(row.action)}</Badge>,
    },
    {
      key: "resource",
      header: "Resource",
      render: (row) => (
        <span className="text-sm">
          {row.resource_type}
          {row.resource_id != null && <span className="ml-1 font-mono text-xs text-muted-foreground">#{row.resource_id}</span>}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP address",
      render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.ip_address ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button size="sm" variant="secondary" onClick={() => setViewing(row)}>
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.audit")}
        subtitle="Every change made in this organization, with before and after values"
        actions={
          meta ? (
            <span className="badge border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {formatCount(meta.total)} entries
            </span>
          ) : undefined
        }
      />

      {error && <ApiErrorBanner error={error} />}

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search audit log…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "resource_type",
            label: "Resource type",
            options: RESOURCE_TYPES.map((type) => ({ value: type, label: type })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.noResults")}
          emptyHint={t("table.noResultsHint")}
          caption={t("nav.audit")}
        />
        {meta && (
          <Pagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onPageChange={(page) => list.set({ page })}
          />
        )}
      </div>

      {viewing && (
        <Modal
          open
          onClose={() => setViewing(null)}
          size="lg"
          title={`${titleCase(viewing.action)} · ${viewing.resource_type}`}
          description={`${viewing.resource_id != null ? `#${viewing.resource_id} · ` : ""}${
            viewing.actor_name ?? "System"
          } · ${viewing.ip_address ?? "unknown IP"}`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <p className="label">Before</p>
              <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
                {pretty(viewing.before)}
              </pre>
            </div>
            <div className="min-w-0">
              <p className="label">After</p>
              <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
                {pretty(viewing.after)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <AuditContent />
    </Suspense>
  );
}
