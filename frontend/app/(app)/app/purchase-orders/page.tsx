"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Lookups, PurchaseOrder } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { PurchaseOrderFormDialog } from "@/components/features/purchase-order-form";

function PurchaseOrdersContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-order_date", filters: ["status", "farm_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<PurchaseOrder>("/purchase-orders", list.params);
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/purchase-orders/${id}`));

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "po_number",
      header: "PO number",
      render: (order) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold tabular-nums text-foreground">{order.po_number}</p>
          <p className="text-xs text-muted-foreground">{order.supplier}</p>
        </div>
      ),
    },
    { key: "order_date", header: "Order date", render: (order) => <DateCell value={order.order_date} /> },
    { key: "expected_date", header: "Expected", render: (order) => <DateCell value={order.expected_date} /> },
    { key: "items", header: "Items", render: (order) => order.items?.length ?? 0 },
    { key: "total", header: t("common.total"), align: "right", render: (order) => <Money value={order.total} /> },
    { key: "status", header: t("common.status"), render: (order) => <StatusBadge status={order.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (order) => (
        <div className="flex justify-end gap-1">
          {can("purchaseorder.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(order)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("purchaseorder.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(order)} aria-label="Delete">
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
        title={t("nav.purchaseOrders")}
        subtitle="Supplier orders and receiving status"
        actions={
          can("purchaseorder.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search purchase orders…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.purchase_order_statuses ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
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
          rowKey={(order) => order.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Create a purchase order to track supplier orders and receiving."
          caption={t("nav.purchaseOrders")}
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
        <PurchaseOrderFormDialog
          order={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <PurchaseOrderFormDialog
          key={editing.id}
          order={editing}
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
        title="Delete purchase order"
        message={`Delete “${deleting?.po_number}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Purchase order deleted");
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

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
