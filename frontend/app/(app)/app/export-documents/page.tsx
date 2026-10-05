"use client";

import { Suspense, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Customer, ExportDocument, Lookups } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { formatNumber, titleCase } from "@/lib/utils";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { ExportDocumentFormDialog } from "@/components/features/export-document-form";

function ExportDocumentsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-ship_date", filters: ["status", "customer_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<ExportDocument>("/export-documents", list.params);
  const { items: customers } = usePaginated<Customer>("/customers", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [editing, setEditing] = useState<ExportDocument | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ExportDocument | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/export-documents/${id}`));

  const columns: Column<ExportDocument>[] = [
    {
      key: "doc_number",
      header: "Doc number",
      render: (doc) => (
        <div className="min-w-0">
          <p className="font-semibold tabular-nums text-foreground">{doc.doc_number}</p>
          <p className="text-xs text-muted-foreground">{doc.product}</p>
        </div>
      ),
    },
    {
      key: "destination_country",
      header: "Destination",
      render: (doc) => doc.destination_country,
    },
    { key: "ship_date", header: "Ship date", render: (doc) => <DateCell value={doc.ship_date} /> },
    {
      key: "transport_mode",
      header: "Transport",
      render: (doc) => (
        <Badge tone="brand">{lookups?.transport_modes[doc.transport_mode] ?? titleCase(doc.transport_mode)}</Badge>
      ),
    },
    {
      key: "quantity",
      header: t("common.quantity"),
      align: "right",
      render: (doc) => `${formatNumber(doc.quantity)} ${doc.unit}`,
    },
    { key: "total", header: t("common.total"), align: "right", render: (doc) => <Money value={doc.total} /> },
    { key: "status", header: t("common.status"), render: (doc) => <StatusBadge status={doc.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (doc) => (
        <div className="flex justify-end gap-1">
          {can("exportdoc.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(doc)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("exportdoc.delete") && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(doc)} aria-label="Delete">
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
        title={t("nav.exportDocs")}
        subtitle="Shipments, customs status and destinations"
        actions={
          can("exportdoc.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search export documents…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: Object.entries(lookups?.export_statuses ?? {}).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "customer_id",
            label: "Customer",
            options: customers.map((customer) => ({ value: String(customer.id), label: customer.name })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(doc) => doc.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Create export documents to track shipments and customs status."
          caption={t("nav.exportDocs")}
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
        <ExportDocumentFormDialog
          document={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <ExportDocumentFormDialog
          key={editing.id}
          document={editing}
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
        title="Delete export document"
        message={`Delete “${deleting?.doc_number}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Export document deleted");
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

export default function ExportDocumentsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ExportDocumentsContent />
    </Suspense>
  );
}
