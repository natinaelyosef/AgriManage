"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Season } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { SeasonFormDialog } from "@/components/features/season-form";

function SeasonsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at" });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Season>("/seasons", list.params);

  const [editing, setEditing] = useState<Season | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Season | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/seasons/${id}`));

  const columns: Column<Season>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (season) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{season.name}</p>
          <p className="text-xs text-muted-foreground">{season.code ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "year",
      header: "Year",
      align: "right",
      render: (season) => <span className="tabular-nums">{season.year}</span>,
    },
    { key: "start_date", header: t("common.from"), render: (season) => <DateCell value={season.start_date} /> },
    { key: "end_date", header: t("common.to"), render: (season) => <DateCell value={season.end_date} /> },
    { key: "status", header: t("common.status"), render: (season) => <StatusBadge status={season.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (season) => (
        <div className="flex justify-end gap-1">
          {can("season.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(season)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("season.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(season)} aria-label="Delete">
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
        title={t("nav.seasons")}
        subtitle="Growing seasons used to plan crops and harvests"
        actions={
          can("season.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search seasons…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(season) => season.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint={t("table.emptyHint")}
          caption={t("nav.seasons")}
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
        <SeasonFormDialog
          season={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <SeasonFormDialog
          key={editing.id}
          season={editing}
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
        title="Delete season"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Season deleted");
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

export default function SeasonsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <SeasonsContent />
    </Suspense>
  );
}
