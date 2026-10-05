"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Lookups, PayrollRun } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { PayrollRunFormDialog } from "@/components/features/payroll-form";

function PayrollContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-period_end", filters: ["status"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<PayrollRun>("/payroll-runs", list.params);
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<PayrollRun | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PayrollRun | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/payroll-runs/${id}`));

  const columns: Column<PayrollRun>[] = [
    {
      key: "period",
      header: "Period",
      render: (run) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <DateCell value={run.period_start} />
          <span className="text-muted-foreground">→</span>
          <DateCell value={run.period_end} />
        </span>
      ),
    },
    { key: "status", header: t("common.status"), render: (run) => <StatusBadge status={run.status} /> },
    {
      key: "workers",
      header: "Workers",
      align: "right",
      render: (run) => run.items?.length ?? 0,
    },
    {
      key: "total",
      header: t("common.total"),
      align: "right",
      render: (run) => <Money value={run.total} />,
    },
    {
      key: "notes",
      header: t("common.notes"),
      render: (run) => (
        <span className="block max-w-56 truncate text-muted-foreground">{run.notes ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (run) => (
        <div className="flex justify-end gap-1">
          {can("payroll.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(run)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("payroll.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(run)} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5 text-critical-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.payroll")}
        subtitle="Wage runs calculated from recorded attendance"
        actions={
          can("payroll.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search payroll runs…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.payroll_statuses ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(run) => run.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Create a payroll run to calculate wages from recorded attendance."
          caption={t("nav.payroll")}
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

      {creating && (
        <PayrollRunFormDialog
          run={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <PayrollRunFormDialog
          key={editing.id}
          run={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete payroll run"
        message={`Delete the payroll run for ${deleting?.period_start} → ${deleting?.period_end}? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Payroll run deleted");
            setDeleting(null);
            void refetch();
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />
    </div>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <PayrollContent />
    </Suspense>
  );
}
