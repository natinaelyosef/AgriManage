"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { AttendanceRecord, Lookups, Worker } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { AttendanceFormDialog } from "@/components/features/attendance-form";

function AttendanceContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-work_date", filters: ["worker_id", "status"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<AttendanceRecord>("/attendance-records", list.params);
  const { items: workers } = usePaginated<Worker>("/workers", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/attendance-records/${id}`));

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "worker",
      header: "Worker",
      render: (record) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{record.worker?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{record.worker?.role ?? "—"}</p>
        </div>
      ),
    },
    { key: "work_date", header: t("common.date"), render: (record) => <DateCell value={record.work_date} /> },
    { key: "status", header: t("common.status"), render: (record) => <StatusBadge status={record.status} /> },
    {
      key: "hours",
      header: "Hours",
      align: "right",
      render: (record) => (record.hours !== null ? formatNumber(record.hours) : "—"),
    },
    {
      key: "notes",
      header: t("common.notes"),
      render: (record) => (
        <span className="block max-w-56 truncate text-muted-foreground">{record.notes ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (record) => (
        <div className="flex justify-end gap-1">
          {can("attendance.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(record)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("attendance.delete") && (
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
        title={t("nav.attendance")}
        subtitle="Daily worker attendance across farms"
        actions={
          can("attendance.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search attendance…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "worker_id",
            label: "Worker",
            options: workers.map((worker) => ({ value: String(worker.id), label: worker.name })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.attendance_statuses ?? {}).map(([value, label]) => ({
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
          rowKey={(record) => record.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Record daily attendance to keep payroll accurate."
          caption={t("nav.attendance")}
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
        <AttendanceFormDialog
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
        <AttendanceFormDialog
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
        title="Delete attendance record"
        message={`Delete the attendance record for “${deleting?.worker?.name ?? "this worker"}” on ${deleting?.work_date}? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Attendance record deleted");
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

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
