"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Contract, Farm, Lookups } from "@/lib/api/types";
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
import { ContractFormDialog } from "@/components/features/contract-form";

function isExpiringSoon(contract: Contract): boolean {
  if (contract.status !== "active" || !contract.end_date) return false;
  const end = new Date(`${contract.end_date.slice(0, 10)}T00:00:00`).getTime();
  const days = end - Date.now();
  return days >= 0 && days <= 30 * 86_400_000;
}

function ContractsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-start_date", filters: ["type", "status", "farm_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Contract>("/contracts", list.params);
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Contract | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/contracts/${id}`));

  const columns: Column<Contract>[] = [
    {
      key: "title",
      header: "Title",
      render: (contract) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{contract.title}</p>
          <p className="text-xs text-muted-foreground">{contract.counterparty}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: t("common.type"),
      render: (contract) => (
        <Badge tone="brand">{lookups?.contract_types[contract.type] ?? titleCase(contract.type)}</Badge>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (contract) => (
        <span className="text-sm text-muted-foreground">
          <DateCell value={contract.start_date} /> →{" "}
          {contract.end_date ? <DateCell value={contract.end_date} /> : "open-ended"}
        </span>
      ),
    },
    {
      key: "value",
      header: t("common.amount"),
      align: "right",
      render: (contract) => <Money value={contract.value} currency={contract.currency} />,
    },
    {
      key: "status",
      header: t("common.status"),
      render: (contract) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={contract.status} />
          {isExpiringSoon(contract) && <Badge tone="warning">Expiring</Badge>}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (contract) => (
        <div className="flex justify-end gap-1">
          {can("contract.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(contract)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("contract.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(contract)} aria-label="Delete">
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
        title={t("nav.contracts")}
        subtitle="Supply, lease and service agreements with counterparties"
        actions={
          can("contract.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search contracts…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "type",
            label: t("common.type"),
            options: Object.entries(lookups?.contract_types ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.contract_statuses ?? {}).map(([value, label]) => ({
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
          rowKey={(contract) => contract.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Register supply, lease and service contracts with counterparties."
          caption={t("nav.contracts")}
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
        <ContractFormDialog
          contract={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <ContractFormDialog
          key={editing.id}
          contract={editing}
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
        title="Delete contract"
        message={`Delete “${deleting?.title}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Contract deleted");
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

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ContractsContent />
    </Suspense>
  );
}
