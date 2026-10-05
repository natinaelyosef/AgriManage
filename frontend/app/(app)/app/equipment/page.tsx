"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Equipment, Farm, Lookups } from "@/lib/api/types";
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
import { EquipmentFormDialog } from "@/components/features/equipment-form";

function EquipmentContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "name", filters: ["type", "status", "farm_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Equipment>("/equipment", list.params);
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<Equipment | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Equipment | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/equipment/${id}`));

  const columns: Column<Equipment>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (equipment) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{equipment.name}</p>
          <p className="text-xs text-muted-foreground">{equipment.code ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: t("common.type"),
      render: (equipment) => <Badge tone="brand">{lookups?.equipment_types[equipment.type] ?? titleCase(equipment.type)}</Badge>,
    },
    {
      key: "farm",
      header: "Farm",
      render: (equipment) => <span className="text-sm text-muted-foreground">{equipment.farm?.name ?? "—"}</span>,
    },
    { key: "serial_number", header: "Serial", render: (equipment) => equipment.serial_number ?? "—" },
    { key: "status", header: t("common.status"), render: (equipment) => <StatusBadge status={equipment.status} /> },
    {
      key: "hours_meter",
      header: "Hours meter",
      align: "right",
      render: (equipment) => (equipment.hours_meter != null ? formatNumber(equipment.hours_meter) : "—"),
    },
    { key: "fuel_type", header: "Fuel", render: (equipment) => equipment.fuel_type ?? "—" },
    { key: "purchase_date", header: "Purchase date", render: (equipment) => <DateCell value={equipment.purchase_date} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (equipment) => (
        <div className="flex justify-end gap-1">
          {can("equipment.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(equipment)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("equipment.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(equipment)} aria-label="Delete">
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
        title={t("nav.equipment")}
        subtitle="Machinery, tools and assets across farms"
        actions={
          can("equipment.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search equipment…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "type",
            label: t("common.type"),
            options: Object.entries(lookups?.equipment_types ?? {}).map(([value, label]) => ({ value, label })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.equipment_statuses ?? {}).map(([value, label]) => ({ value, label })),
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
          rowKey={(equipment) => equipment.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Add your first piece of equipment to start tracking assets."
          caption={t("nav.equipment")}
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
        <EquipmentFormDialog
          item={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <EquipmentFormDialog
          key={editing.id}
          item={editing}
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
        title="Delete equipment"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Equipment deleted");
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

export default function EquipmentPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <EquipmentContent />
    </Suspense>
  );
}
