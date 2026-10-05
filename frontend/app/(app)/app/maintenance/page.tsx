"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Equipment, Lookups, MaintenanceRecord } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { MaintenanceRecordFormDialog } from "@/components/features/maintenance-form";

function MaintenanceContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "next_due_date", filters: ["status", "type", "equipment_id", "overdue"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<MaintenanceRecord>("/maintenance-records", list.params);
  const { items: equipment } = usePaginated<Equipment>("/equipment", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MaintenanceRecord | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/maintenance-records/${id}`));

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const columns: Column<MaintenanceRecord>[] = [
    {
      key: "title",
      header: t("common.name"),
      render: (record) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{record.title}</p>
          <p className="text-xs text-muted-foreground">{titleCase(record.type)}</p>
        </div>
      ),
    },
    {
      key: "equipment",
      header: "Equipment",
      render: (record) => <span className="text-sm text-muted-foreground">{record.equipment?.name ?? "—"}</span>,
    },
    { key: "status", header: t("common.status"), render: (record) => <StatusBadge status={record.status} /> },
    { key: "performed_date", header: "Performed", render: (record) => <DateCell value={record.performed_date} /> },
    {
      key: "next_due_date",
      header: "Next due",
      render: (record) => {
        const date = record.next_due_date;
        const overdue =
          date != null &&
          date.slice(0, 10) < today &&
          record.status !== "completed" &&
          record.status !== "cancelled";
        return (
          <span className={overdue ? "font-semibold text-critical-600" : ""}>
            <DateCell value={date} />
          </span>
        );
      },
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      render: (record) => (record.cost != null ? <Money value={record.cost} /> : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (record) => (
        <div className="flex justify-end gap-1">
          {can("maintenance.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(record)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("maintenance.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(record)} aria-label="Delete">
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
        title={t("nav.maintenance")}
        subtitle="Service schedules, repairs and upkeep"
        actions={
          can("maintenance.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search maintenance records…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.maintenance_statuses ?? {}).map(([value, label]) => ({ value, label })),
          },
          {
            key: "type",
            label: t("common.type"),
            options: Object.entries(lookups?.maintenance_types ?? {}).map(([value, label]) => ({ value, label })),
          },
          {
            key: "equipment_id",
            label: "Equipment",
            options: equipment.map((item) => ({ value: String(item.id), label: item.name })),
          },
          {
            key: "overdue",
            label: "Due",
            options: [{ value: "1", label: "Overdue only" }],
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(record) => record.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Schedule maintenance to keep equipment running."
          caption={t("nav.maintenance")}
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
        <MaintenanceRecordFormDialog
          record={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <MaintenanceRecordFormDialog
          key={editing.id}
          record={editing}
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
        title="Delete maintenance record"
        message={`Delete “${deleting?.title}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Maintenance record deleted");
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

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <MaintenanceContent />
    </Suspense>
  );
}
