"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Customer } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { CustomerFormDialog } from "@/components/features/customer-form";

function CustomersContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at", filters: ["status", "type"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Customer>("/customers", list.params);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/customers/${id}`));

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (customer) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{customer.name}</p>
          <p className="text-xs text-muted-foreground">{titleCase(customer.type)}</p>
        </div>
      ),
    },
    { key: "phone", header: t("auth.phone"), render: (customer) => customer.phone ?? "—" },
    { key: "email", header: t("auth.email"), render: (customer) => customer.email ?? "—" },
    { key: "region", header: t("auth.region"), render: (customer) => customer.region ?? "—" },
    {
      key: "credit_limit",
      header: "Credit limit",
      align: "right",
      render: (customer) =>
        customer.credit_limit != null ? <Money value={customer.credit_limit} /> : "—",
    },
    { key: "status", header: t("common.status"), render: (customer) => <StatusBadge status={customer.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (customer) => (
        <div className="flex justify-end gap-1">
          {can("customer.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(customer)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("customer.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(customer)} aria-label="Delete">
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
        title="Customers"
        subtitle="Buyers, exporters and off-takers"
        actions={
          can("customer.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search customers…"
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
          {
            key: "type",
            label: t("common.type"),
            options: [
              { value: "individual", label: "Individual" },
              { value: "business", label: "Business" },
              { value: "exporter", label: "Exporter" },
            ],
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(customer) => customer.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Add your first customer to start recording sales."
          caption="Customers"
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
        <CustomerFormDialog
          customer={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <CustomerFormDialog
          key={editing.id}
          customer={editing}
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
        title="Delete customer"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Customer deleted");
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

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <CustomersContent />
    </Suspense>
  );
}
