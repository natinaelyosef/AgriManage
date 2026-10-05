"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Area } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { FarmFormDialog } from "@/components/features/farm-form";

function FarmsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const list = useListQuery({ sort: "-created_at", filters: ["status"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Farm>("/farms", list.params);

  const [editing, setEditing] = useState<Farm | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Farm | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/farms/${id}`));

  const columns: Column<Farm>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (farm) => (
        <div className="min-w-0">
          <Link href={`/app/farms/${farm.id}`} className="font-semibold text-foreground hover:text-brand-700">
            {farm.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {farm.code ?? "—"} · {farm.type}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (farm) => (
        <span className="text-sm text-muted-foreground">
          {[farm.region, farm.woreda, farm.kebele].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    { key: "area", header: t("common.area"), align: "right", render: (farm) => <Area value={farm.area_hectares} /> },
    {
      key: "cultivated",
      header: t("dashboard.kpi.cultivated"),
      align: "right",
      render: (farm) => <Area value={farm.cultivated_hectares} />,
    },
    { key: "fields", header: "Fields", align: "right", render: (farm) => farm.fields?.length ?? 0 },
    { key: "status", header: t("common.status"), render: (farm) => <StatusBadge status={farm.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (farm) => (
        <div className="flex justify-end gap-1">
          {can("farm.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(farm)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("farm.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(farm)} aria-label="Delete">
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
        title={t("nav.farms")}
        subtitle="All farms registered in this organization"
        actions={
          can("farm.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search farms…"
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
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(farm) => farm.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint={t("table.emptyHint")}
          onRowClick={(farm) => router.push(`/app/farms/${farm.id}`)}
          caption={t("nav.farms")}
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
        <FarmFormDialog
          farm={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <FarmFormDialog
          key={editing.id}
          farm={editing}
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
        title="Delete farm"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Farm deleted");
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

export default function FarmsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <FarmsContent />
    </Suspense>
  );
}
