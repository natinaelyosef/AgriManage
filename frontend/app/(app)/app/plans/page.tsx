"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError, type Paginated } from "@/lib/api/client";
import type { CropPlan, Field, Lookups, Season } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Area, DateCell } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { PlanFormDialog } from "@/components/features/plan-form";

function PlansContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const list = useListQuery({ sort: "-created_at", filters: ["season_id", "status", "field_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<CropPlan>("/crop-plans", list.params);
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");
  const { data: seasonsPayload } = useResource<Paginated<Season>>("/seasons", { per_page: 100 });
  const { data: fieldsPayload } = useResource<Paginated<Field>>("/fields", { per_page: 100 });

  const [editing, setEditing] = useState<CropPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CropPlan | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/crop-plans/${id}`));

  const columns: Column<CropPlan>[] = [
    {
      key: "crop",
      header: "Crop",
      render: (plan) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{plan.crop?.name ?? "—"}</p>
          {plan.variety && <p className="text-xs text-muted-foreground">{plan.variety}</p>}
        </div>
      ),
    },
    {
      key: "field",
      header: "Field",
      render: (plan) => (
        <span className="text-sm">
          {plan.field?.name ?? "—"}
          {plan.field?.farm?.name && <span className="text-muted-foreground"> · {plan.field.farm.name}</span>}
        </span>
      ),
    },
    { key: "season", header: "Season", render: (plan) => plan.season?.name ?? "—" },
    { key: "area", header: t("common.area"), align: "right", render: (plan) => <Area value={plan.planned_area_hectares} /> },
    { key: "planting", header: "Planting", render: (plan) => <DateCell value={plan.planting_date} /> },
    { key: "expected", header: "Expected harvest", render: (plan) => <DateCell value={plan.expected_harvest_date} /> },
    {
      key: "yield",
      header: "Yield (exp / act)",
      align: "right",
      render: (plan) => (
        <span className="tabular-nums">
          {formatNumber(plan.expected_yield ?? 0, 2)} / {formatNumber(plan.actual_yield ?? 0, 2)}
          {plan.yield_unit ? ` ${plan.yield_unit}` : ""}
        </span>
      ),
    },
    { key: "status", header: t("common.status"), render: (plan) => <StatusBadge status={plan.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (plan) => (
        <div className="flex justify-end gap-1">
          {can("plan.edit") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setEditing(plan);
              }}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("plan.delete") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(plan);
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
        title={t("nav.cropPlans")}
        subtitle="Season plans per field, from planting to harvest"
        actions={
          can("plan.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search variety, crop, field or season…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "season_id",
            label: "Season",
            options: (seasonsPayload?.data ?? []).map((season) => ({ value: String(season.id), label: season.name })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.data.statuses.plan ?? {}).map(([value, label]) => ({ value, label })),
          },
          {
            key: "field_id",
            label: "Field",
            options: (fieldsPayload?.data ?? []).map((field) => ({ value: String(field.id), label: field.name })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(plan) => plan.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Create a crop plan to start tracking a season."
          onRowClick={(plan) => router.push(`/app/plans/${plan.id}`)}
          caption={t("nav.cropPlans")}
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
        <PlanFormDialog
          plan={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <PlanFormDialog
          key={editing.id}
          plan={editing}
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
        title="Delete crop plan"
        message={`Delete the plan for “${deleting?.crop?.name ?? "this crop"}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Crop plan deleted");
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

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <PlansContent />
    </Suspense>
  );
}
