"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { HarvestBatch, Lookups } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money, Quantity } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { HarvestFormDialog } from "@/components/features/harvest-form";

function HarvestContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-harvest_date", filters: ["status", "quality_status", "crop_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<HarvestBatch>("/harvest-batches", list.params);
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");

  const [editing, setEditing] = useState<HarvestBatch | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<HarvestBatch | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/harvest-batches/${id}`));

  const columns: Column<HarvestBatch>[] = [
    {
      key: "batch_number",
      header: "Batch",
      render: (batch) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-foreground">{batch.batch_number}</p>
          {batch.qr_code && <p className="text-[0.7rem] text-muted-foreground">QR {batch.qr_code}</p>}
        </div>
      ),
    },
    {
      key: "crop",
      header: "Crop",
      render: (batch) => <span className="font-medium">{batch.crop?.name ?? "—"}</span>,
    },
    {
      key: "field",
      header: "Field",
      render: (batch) => (
        <span className="text-sm">
          {batch.field?.name ?? "—"}
          {batch.field?.farm?.name && <span className="text-muted-foreground"> · {batch.field.farm.name}</span>}
        </span>
      ),
    },
    { key: "harvest_date", header: t("common.date"), render: (batch) => <DateCell value={batch.harvest_date} /> },
    {
      key: "quantity",
      header: t("common.quantity"),
      align: "right",
      render: (batch) => <Quantity value={batch.quantity} unit={batch.unit} />,
    },
    { key: "grade", header: "Grade", render: (batch) => batch.grade ?? "—" },
    { key: "quality", header: "Quality", render: (batch) => <StatusBadge status={batch.quality_status} /> },
    { key: "status", header: t("common.status"), render: (batch) => <StatusBadge status={batch.status} /> },
    {
      key: "unit_price",
      header: "Unit price",
      align: "right",
      render: (batch) => (batch.unit_price != null ? <Money value={batch.unit_price} /> : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (batch) => (
        <div className="flex justify-end gap-1">
          {can("harvest.edit") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setEditing(batch);
              }}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("harvest.delete") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(batch);
              }}
              aria-label="Delete"
            >
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
        title={t("nav.harvest")}
        subtitle="Batches recorded from the field to storage"
        actions={
          can("harvest.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search batch, field, crop or grade…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.data.statuses.harvest ?? {}).map(([value, label]) => ({ value, label })),
          },
          {
            key: "quality_status",
            label: "Quality",
            options: Object.entries(lookups?.data.statuses.quality ?? {}).map(([value, label]) => ({ value, label })),
          },
          {
            key: "crop_id",
            label: "Crop",
            options: (lookups?.data.crops ?? []).map((crop) => ({ value: String(crop.id), label: crop.name })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(batch) => batch.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Record your first harvest batch to start tracking yield."
          onRowClick={can("harvest.edit") ? (batch) => setEditing(batch) : undefined}
          caption={t("nav.harvest")}
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
        <HarvestFormDialog
          batch={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <HarvestFormDialog
          key={editing.id}
          batch={editing}
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
        title="Delete harvest batch"
        message={`Delete batch “${deleting?.batch_number}”? Planned yield will be recalculated.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Harvest batch deleted");
            setDeleting(null);
            void refetch();
          } catch (error) {
            toast.error((error as ApiError).message);
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

export default function HarvestPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <HarvestContent />
    </Suspense>
  );
}
