"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Expense, Lookups } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { ExpenseFormDialog } from "@/components/features/expense-form";

function ExpensesContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-expense_date", filters: ["category", "status", "payment_method"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Expense>("/expenses", list.params);
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/expenses/${id}`));

  const columns: Column<Expense>[] = [
    {
      key: "title",
      header: "Title",
      render: (expense) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{expense.title}</p>
          <p className="text-xs text-muted-foreground">{expense.supplier_name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: t("common.type"),
      render: (expense) => (
        <Badge tone="brand">{lookups?.expense_categories[expense.category] ?? titleCase(expense.category)}</Badge>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      align: "right",
      render: (expense) => <Money value={expense.amount} currency={expense.currency} />,
    },
    { key: "expense_date", header: t("common.date"), render: (expense) => <DateCell value={expense.expense_date} /> },
    {
      key: "payment_method",
      header: "Method",
      render: (expense) => (
        <span className="text-sm text-muted-foreground">
          {lookups?.payment_methods[expense.payment_method] ?? titleCase(expense.payment_method)}
        </span>
      ),
    },
    {
      key: "farm",
      header: "Farm / field",
      render: (expense) => (
        <span className="text-sm text-muted-foreground">
          {[expense.farm?.name, expense.field?.name].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    { key: "status", header: t("common.status"), render: (expense) => <StatusBadge status={expense.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (expense) => (
        <div className="flex justify-end gap-1">
          {can("expense.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(expense)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("expense.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(expense)} aria-label="Delete">
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
        title={t("nav.expenses")}
        subtitle="Farm spending by category and period"
        actions={
          can("expense.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search expenses…"
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
            options: [
              { value: "pending", label: t("status.pending") },
              { value: "paid", label: t("status.paid") },
              { value: "approved", label: "Approved" },
              { value: "cancelled", label: t("status.cancelled") },
            ],
          },
          {
            key: "payment_method",
            label: "Method",
            options: Object.entries(lookups?.payment_methods ?? {}).map(([value, label]) => ({
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
          rowKey={(expense) => expense.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Record your first expense to see spending trends."
          caption={t("nav.expenses")}
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
        <ExpenseFormDialog
          expense={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <ExpenseFormDialog
          key={editing.id}
          expense={editing}
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
        title="Delete expense"
        message={`Delete “${deleting?.title}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Expense deleted");
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

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ExpensesContent />
    </Suspense>
  );
}
