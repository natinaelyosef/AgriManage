"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { CropFormDialog, type CropRecord } from "@/components/features/crop-form";

function CropsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "name" });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<CropRecord>("/crops", list.params);

  const [editing, setEditing] = useState<CropRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CropRecord | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/crops/${id}`));

  const columns: Column<CropRecord>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (crop) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{crop.name}</p>
          {crop.scientific_name && <p className="text-xs italic text-muted-foreground">{crop.scientific_name}</p>}
        </div>
      ),
    },
    { key: "category", header: t("common.type"), render: (crop) => <span className="capitalize">{crop.category}</span> },
    { key: "unit", header: t("common.unit"), render: (crop) => crop.default_unit ?? "—" },
    {
      key: "growing_days",
      header: "Growing days",
      align: "right",
      render: (crop) => (crop.growing_days != null ? `${crop.growing_days} d` : "—"),
    },
    {
      key: "scientific_name",
      header: "Scientific name",
      render: (crop) => <span className="text-sm text-muted-foreground">{crop.scientific_name ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (crop) => (
        <div className="flex justify-end gap-1">
          {can("crop.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(crop)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("crop.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(crop)} aria-label="Delete">
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
        title={t("nav.crops")}
        subtitle="Crop catalog shared across seasons and plans"
        actions={
          can("crop.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search crops…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(crop) => crop.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint={t("table.emptyHint")}
          caption={t("nav.crops")}
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
        <CropFormDialog
          crop={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <CropFormDialog
          key={editing.id}
          crop={editing}
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
        title="Delete crop"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Crop deleted");
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

export default function CropsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <CropsContent />
    </Suspense>
  );
}
