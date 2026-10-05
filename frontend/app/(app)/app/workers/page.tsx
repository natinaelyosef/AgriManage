"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Worker } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { WorkerFormDialog } from "@/components/features/worker-form";

function WorkersContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at", filters: ["status", "employment_type", "farm_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Worker>("/workers", list.params);
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [editing, setEditing] = useState<Worker | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Worker | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/workers/${id}`));

  const columns: Column<Worker>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (worker) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{worker.name}</p>
          <p className="text-xs text-muted-foreground">{worker.role ?? "—"}</p>
        </div>
      ),
    },
    { key: "phone", header: t("auth.phone"), render: (worker) => worker.phone ?? "—" },
    { key: "farm", header: "Farm", render: (worker) => <span className="text-sm text-muted-foreground">{worker.farm?.name ?? "—"}</span> },
    {
      key: "employment_type",
      header: "Type",
      render: (worker) => <Badge tone="brand">{worker.employment_type}</Badge>,
    },
    {
      key: "daily_rate",
      header: "Daily rate",
      align: "right",
      render: (worker) => <Money value={worker.daily_rate} currency={worker.currency} />,
    },
    { key: "hire_date", header: "Hire date", render: (worker) => <DateCell value={worker.hire_date} /> },
    { key: "status", header: t("common.status"), render: (worker) => <StatusBadge status={worker.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (worker) => (
        <div className="flex justify-end gap-1">
          {can("worker.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(worker)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("worker.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(worker)} aria-label="Delete">
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
        title={t("nav.workers")}
        subtitle="Labor force across farms and seasons"
        actions={
          can("worker.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search workers…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: [
              { value: "active", label: t("status.active") },
              { value: "inactive", label: t("status.inactive") },
            ],
          },
          {
            key: "employment_type",
            label: "Type",
            options: [
              { value: "permanent", label: "Permanent" },
              { value: "seasonal", label: "Seasonal" },
              { value: "daily", label: "Daily" },
              { value: "contract", label: "Contract" },
            ],
          },
          {
            key: "farm_id",
            label: "Farm",
            options: farms.map((farm) => ({ value: String(farm.id), label: farm.name })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(worker) => worker.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Add your first worker to start tracking labor."
          caption={t("nav.workers")}
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
        <WorkerFormDialog
          worker={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <WorkerFormDialog
          key={editing.id}
          worker={editing}
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
        title="Delete worker"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Worker deleted");
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

export default function WorkersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <WorkersContent />
    </Suspense>
  );
}
