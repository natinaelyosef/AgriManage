"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Field, Lookups, Treatment } from "@/lib/api/types";
import { titleCase } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { TreatmentFormDialog } from "@/components/features/treatment-form";

function TreatmentsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-applied_date", filters: ["category", "field_id", "method"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Treatment>("/treatments", list.params);
  const { items: fields } = usePaginated<Field>("/fields", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<Treatment | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Treatment | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/treatments/${id}`));

  const columns: Column<Treatment>[] = [
    {
      key: "product_name",
      header: t("common.name"),
      render: (treatment) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{treatment.product_name}</p>
          <p className="text-xs text-muted-foreground">
            {lookups?.treatment_categories[treatment.category] ?? titleCase(treatment.category)}
          </p>
        </div>
      ),
    },
    { key: "applied_date", header: t("common.date"), render: (treatment) => <DateCell value={treatment.applied_date} /> },
    {
      key: "field",
      header: "Field",
      render: (treatment) => (
        <span className="text-sm text-muted-foreground">{treatment.field?.name ?? "—"}</span>
      ),
    },
    {
      key: "dose",
      header: "Dose",
      render: (treatment) =>
        treatment.dose != null
          ? [treatment.dose, treatment.dose_unit].filter(Boolean).join(" ")
          : "—",
    },
    {
      key: "method",
      header: "Method",
      render: (treatment) => (
        <span className="text-sm text-muted-foreground">
          {treatment.method
            ? lookups?.treatment_methods[treatment.method] ?? titleCase(treatment.method)
            : "—"}
        </span>
      ),
    },
    {
      key: "inventory_item",
      header: "Inventory item",
      render: (treatment) => (
        <span className="text-sm text-muted-foreground">{treatment.inventoryItem?.name ?? "—"}</span>
      ),
    },
    {
      key: "cost",
      header: t("common.amount"),
      align: "right",
      render: (treatment) => (treatment.cost != null ? <Money value={treatment.cost} /> : "—"),
    },
    {
      key: "pre_harvest_interval_days",
      header: "PHI (days)",
      align: "right",
      render: (treatment) =>
        treatment.pre_harvest_interval_days != null ? treatment.pre_harvest_interval_days : "—",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (treatment) => (
        <div className="flex justify-end gap-1">
          {can("treatment.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(treatment)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("treatment.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(treatment)} aria-label="Delete">
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
        title={t("nav.treatments")}
        subtitle="Crop protection and nutrition applications"
        actions={
          can("treatment.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search treatments…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "category",
            label: t("common.type"),
            options: Object.entries(lookups?.treatment_categories ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "field_id",
            label: "Field",
            options: fields.map((field) => ({ value: String(field.id), label: field.name })),
          },
          {
            key: "method",
            label: "Method",
            options: Object.entries(lookups?.treatment_methods ?? {}).map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(treatment) => treatment.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Log your first treatment to start tracking crop protection."
          caption={t("nav.treatments")}
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
        <TreatmentFormDialog
          treatment={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <TreatmentFormDialog
          key={editing.id}
          treatment={editing}
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
        title="Delete treatment"
        message={`Delete the “${deleting?.product_name ?? "selected"}” treatment? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Treatment deleted");
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

export default function TreatmentsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <TreatmentsContent />
    </Suspense>
  );
}
