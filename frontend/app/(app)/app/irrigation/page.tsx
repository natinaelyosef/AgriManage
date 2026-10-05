"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Field, IrrigationEvent, Lookups } from "@/lib/api/types";
import { formatNumber, titleCase } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { IrrigationFormDialog } from "@/components/features/irrigation-form";

function IrrigationContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-irrigation_date", filters: ["field_id", "method", "farm_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<IrrigationEvent>("/irrigation-events", list.params);
  const { items: fields } = usePaginated<Field>("/fields", { per_page: 100 });
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<IrrigationEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<IrrigationEvent | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/irrigation-events/${id}`));

  const columns: Column<IrrigationEvent>[] = [
    {
      key: "field",
      header: "Field",
      render: (event) => (
        <span className="text-sm text-muted-foreground">{event.field?.name ?? "—"}</span>
      ),
    },
    { key: "irrigation_date", header: t("common.date"), render: (event) => <DateCell value={event.irrigation_date} /> },
    {
      key: "method",
      header: "Method",
      render: (event) => (
        <Badge tone="brand">{lookups?.irrigation_methods[event.method] ?? titleCase(event.method)}</Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          {event.source ? lookups?.irrigation_sources[event.source] ?? titleCase(event.source) : "—"}
        </span>
      ),
    },
    {
      key: "volume_m3",
      header: "Volume m³",
      align: "right",
      render: (event) =>
        event.volume_m3 != null ? formatNumber(event.volume_m3, event.volume_m3 % 1 === 0 ? 0 : 2) : "—",
    },
    {
      key: "duration_minutes",
      header: "Duration min",
      align: "right",
      render: (event) => (event.duration_minutes != null ? formatNumber(event.duration_minutes) : "—"),
    },
    {
      key: "cost",
      header: t("common.amount"),
      align: "right",
      render: (event) => (event.cost != null ? <Money value={event.cost} /> : "—"),
    },
    {
      key: "worker",
      header: "Performed by",
      render: (event) => <span className="text-sm text-muted-foreground">{event.worker?.name ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (event) => (
        <div className="flex justify-end gap-1">
          {can("irrigation.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(event)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("irrigation.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(event)} aria-label="Delete">
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
        title={t("nav.irrigation")}
        subtitle="Water application across every field"
        actions={
          can("irrigation.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search irrigation events…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "field_id",
            label: "Field",
            options: fields.map((field) => ({ value: String(field.id), label: field.name })),
          },
          {
            key: "method",
            label: "Method",
            options: Object.entries(lookups?.irrigation_methods ?? {}).map(([value, label]) => ({ value, label })),
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
          rowKey={(event) => event.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Log your first irrigation event to start tracking water use."
          caption={t("nav.irrigation")}
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
        <IrrigationFormDialog
          event={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <IrrigationFormDialog
          key={editing.id}
          event={editing}
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
        title="Delete irrigation event"
        message={`Delete the irrigation event from “${deleting?.field?.name ?? "this field"}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Irrigation event deleted");
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

export default function IrrigationPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <IrrigationContent />
    </Suspense>
  );
}
