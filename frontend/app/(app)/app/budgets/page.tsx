"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Budget, Lookups } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { BudgetFormDialog } from "@/components/features/budget-form";

function BudgetsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-period_start", filters: ["category", "status"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Budget>("/budgets", list.params);
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<Budget | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/budgets/${id}`));

  const columns: Column<Budget>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (budget) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{budget.name}</p>
          <p className="text-xs text-muted-foreground">
            {lookups?.expense_categories[budget.category] ?? titleCase(budget.category)}
          </p>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (budget) => (
        <span className="text-sm text-muted-foreground">
          <DateCell value={budget.period_start} /> → <DateCell value={budget.period_end} />
        </span>
      ),
    },
    { key: "amount", header: t("common.amount"), align: "right", render: (budget) => <Money value={budget.amount} /> },
    {
      key: "spent",
      header: "Spent",
      align: "right",
      render: (budget) => (
        <Money
          value={budget.spent ?? 0}
          className={(budget.spent ?? 0) > budget.amount ? "text-critical-600 font-semibold" : undefined}
        />
      ),
    },
    {
      key: "utilization",
      header: "Utilization",
      align: "right",
      render: (budget) => {
        const spent = budget.spent ?? 0;
        const utilization = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
        return (
          <span className={utilization >= 90 ? "text-critical-600" : "text-muted-foreground"}>{utilization}%</span>
        );
      },
    },
    { key: "status", header: t("common.status"), render: (budget) => <StatusBadge status={budget.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (budget) => (
        <div className="flex justify-end gap-1">
          {can("budget.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(budget)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("budget.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(budget)} aria-label="Delete">
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
        title={t("nav.budgets")}
        subtitle="Category budgets across farms and periods"
        actions={
          can("budget.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search budgets…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "category",
            label: t("common.type"),
            options: Object.entries(lookups?.expense_categories ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.budget_statuses ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(budget) => budget.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Set category budgets to keep spending on track."
          caption={t("nav.budgets")}
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
        <BudgetFormDialog
          budget={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <BudgetFormDialog
          key={editing.id}
          budget={editing}
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
        title="Delete budget"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Budget deleted");
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

export default function BudgetsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <BudgetsContent />
    </Suspense>
  );
}
