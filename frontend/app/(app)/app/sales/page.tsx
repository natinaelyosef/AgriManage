"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated } from "@/lib/api/hooks";
import type { Sale } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { useToast } from "@/components/ui/toast";
import { SaleFormDialog } from "@/components/features/sale-form";

function SalesContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const list = useListQuery({ sort: "-sale_date", filters: ["payment_status"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Sale>("/sales", list.params);

  const [creating, setCreating] = useState(false);

  const columns: Column<Sale>[] = [
    {
      key: "invoice_number",
      header: "Invoice",
      render: (sale) => (
        <Link href={`/app/sales/${sale.id}`} className="font-mono text-xs font-semibold text-foreground hover:text-brand-700">
          {sale.invoice_number}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (sale) => sale.customer?.name ?? <span className="text-muted-foreground">Walk-in</span>,
    },
    { key: "sale_date", header: t("common.date"), render: (sale) => <DateCell value={sale.sale_date} /> },
    {
      key: "total",
      header: t("common.total"),
      align: "right",
      render: (sale) => <Money value={sale.total} currency={sale.currency} />,
    },
    {
      key: "paid_amount",
      header: "Paid",
      align: "right",
      render: (sale) => <Money value={sale.paid_amount} currency={sale.currency} />,
    },
    {
      key: "payment_status",
      header: "Payment",
      render: (sale) => <StatusBadge status={sale.payment_status} />,
    },
    { key: "status", header: t("common.status"), render: (sale) => <StatusBadge status={sale.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (sale) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => router.push(`/app/sales/${sale.id}`)} aria-label="View">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.sales")}
        subtitle="Invoices, harvest sales and receivables"
        actions={
          can("sale.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search invoices…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "payment_status",
            label: "Payment",
            options: [
              { value: "unpaid", label: "Unpaid" },
              { value: "partial", label: t("status.partial") },
              { value: "paid", label: t("status.paid") },
            ],
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(sale) => sale.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Create your first sale invoice to start tracking revenue."
          onRowClick={(sale) => router.push(`/app/sales/${sale.id}`)}
          caption={t("nav.sales")}
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
        <SaleFormDialog
          sale={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <SalesContent />
    </Suspense>
  );
}
