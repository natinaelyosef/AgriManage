"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { InventoryItem, Lookups } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money, Quantity } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { InventoryFormDialog } from "@/components/features/inventory-form";

function isLow(item: InventoryItem): boolean {
  return item.reorder_level > 0 && item.quantity <= item.reorder_level;
}

function InventoryContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const list = useListQuery({ sort: "-created_at", filters: ["category", "low_stock"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<InventoryItem>("/inventory-items", list.params);
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/inventory-items/${id}`));

  const columns: Column<InventoryItem>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (item) => (
        <div className="min-w-0">
          <Link href={`/app/inventory/${item.id}`} className="font-semibold text-foreground hover:text-brand-700">
            {item.name}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{item.sku ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: t("common.type"),
      render: (item) => <Badge tone="brand">{lookups?.inventory_categories[item.category] ?? titleCase(item.category)}</Badge>,
    },
    {
      key: "quantity",
      header: t("common.quantity"),
      align: "right",
      render: (item) => (
        <span className="inline-flex items-center justify-end gap-1.5">
          <Quantity value={item.quantity} unit={item.unit} />
          {isLow(item) && <Badge tone="warning">Low</Badge>}
        </span>
      ),
    },
    {
      key: "unit_cost",
      header: "Unit cost",
      align: "right",
      render: (item) => <Money value={item.unit_cost} />,
    },
    { key: "warehouse", header: "Warehouse", render: (item) => item.warehouse ?? "—" },
    { key: "expiry_date", header: "Expiry", render: (item) => <DateCell value={item.expiry_date} /> },
    { key: "status", header: t("common.status"), render: (item) => <StatusBadge status={item.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <div className="flex justify-end gap-1">
          {can("inventory.edit") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setEditing(item);
              }}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("inventory.delete") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(item);
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
        title={t("nav.inventory")}
        subtitle="Inputs, tools and harvested produce in stock"
        actions={
          can("inventory.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search inventory…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "category",
            label: t("common.type"),
            options: Object.entries(lookups?.inventory_categories ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "low_stock",
            label: "Stock",
            options: [{ value: "1", label: t("dashboard.kpi.lowStock") }],
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(item) => item.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Add inventory items to track stock levels."
          onRowClick={(item) => router.push(`/app/inventory/${item.id}`)}
          caption={t("nav.inventory")}
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
        <InventoryFormDialog
          item={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <InventoryFormDialog
          key={editing.id}
          item={editing}
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
        title="Delete item"
        message={`Delete “${deleting?.name}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Item deleted");
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

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <InventoryContent />
    </Suspense>
  );
}
