"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, LandRecord, Lookups } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber, titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { LandRecordFormDialog } from "@/components/features/land-record-form";

function isPastDate(iso?: string | null): boolean {
  if (!iso) return false;
  const due = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function LandRecordsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at", filters: ["tenure_type", "status", "farm_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<LandRecord>("/land-records", list.params);
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<LandRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LandRecord | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/land-records/${id}`));

  const columns: Column<LandRecord>[] = [
    {
      key: "parcel_name",
      header: "Parcel",
      render: (record) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{record.parcel_name}</p>
          <p className="text-xs text-muted-foreground">{record.holder_name}</p>
        </div>
      ),
    },
    {
      key: "tenure_type",
      header: "Tenure",
      render: (record) => (
        <Badge tone="brand">{lookups?.tenure_types[record.tenure_type] ?? titleCase(record.tenure_type)}</Badge>
      ),
    },
    {
      key: "area_hectares",
      header: t("common.area"),
      align: "right",
      render: (record) => <span className="tabular-nums">{formatNumber(record.area_hectares, 2)} ha</span>,
    },
    {
      key: "document_number",
      header: "Document",
      render: (record) => <span className="font-mono text-xs">{record.document_number ?? "—"}</span>,
    },
    {
      key: "expiry_date",
      header: "Expiry",
      render: (record) =>
        isPastDate(record.expiry_date) ? (
          <span className="text-critical-600 font-semibold">
            <DateCell value={record.expiry_date} />
          </span>
        ) : (
          <DateCell value={record.expiry_date} />
        ),
    },
    {
      key: "location",
      header: "Location",
      render: (record) => {
        const location = [record.region, record.zone, record.woreda].filter(Boolean).join(", ");
        return <span className="text-sm text-muted-foreground">{location || "—"}</span>;
      },
    },
    { key: "status", header: t("common.status"), render: (record) => <StatusBadge status={record.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (record) => (
        <div className="flex justify-end gap-1">
          {can("landrecord.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(record)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("landrecord.delete") && (
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
        title={t("nav.landRecords")}
        subtitle="Title deeds, leases and permits across farms"
        actions={
          can("landrecord.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search land records…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "tenure_type",
            label: "Tenure",
            options: Object.entries(lookups?.tenure_types ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: [
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
              { value: "expired", label: "Expired" },
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
          rowKey={(record) => record.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Track title deeds, leases and permits for your parcels."
          caption={t("nav.landRecords")}
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
        <LandRecordFormDialog
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
        <LandRecordFormDialog
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
        title="Delete land record"
        message={`Delete “${deleting?.parcel_name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Land record deleted");
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

export default function LandRecordsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <LandRecordsContent />
    </Suspense>
  );
}
