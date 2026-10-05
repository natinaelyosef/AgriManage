"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Field } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Area } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { FieldFormDialog } from "@/components/features/field-form";

function FieldsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const list = useListQuery({ sort: "-created_at", filters: ["farm_id", "status"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Field>("/fields", list.params);
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [editing, setEditing] = useState<Field | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Field | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/fields/${id}`));

  const columns: Column<Field>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/app/fields/${row.id}`}
            className="font-semibold text-foreground hover:text-brand-700"
            onClick={(event) => event.stopPropagation()}
          >
            {row.name}
          </Link>
          <p className="text-xs text-muted-foreground">{row.code ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "farm",
      header: "Farm",
      render: (row) => (
        <Link
          href={`/app/farms/${row.farm_id}`}
          className="text-sm text-muted-foreground hover:text-brand-700"
          onClick={(event) => event.stopPropagation()}
        >
          {row.farm?.name ?? "—"}
        </Link>
      ),
    },
    { key: "area", header: t("common.area"), align: "right", render: (row) => <Area value={row.area_hectares} /> },
    { key: "soil", header: "Soil", render: (row) => row.soil_type ?? "—" },
    { key: "irrigation", header: "Irrigation", render: (row) => row.irrigation_type ?? "—" },
    { key: "status", header: t("common.status"), render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {can("field.edit") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setEditing(row);
              }}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("field.delete") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(row);
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
        title={t("nav.fields")}
        subtitle="Plots and parcels registered across your farms"
        actions={
          can("field.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search fields…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "farm_id",
            label: "Farm",
            options: farms.map((farm) => ({ value: String(farm.id), label: farm.name })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: [
              { value: "active", label: t("status.active") },
              { value: "inactive", label: t("status.inactive") },
            ],
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint={t("table.emptyHint")}
          onRowClick={(row) => router.push(`/app/fields/${row.id}`)}
          caption={t("nav.fields")}
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
        <FieldFormDialog
          field={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <FieldFormDialog
          key={editing.id}
          field={editing}
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
        title="Delete field"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Field deleted");
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

export default function FieldsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <FieldsContent />
    </Suspense>
  );
}
