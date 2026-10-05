"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/api/hooks";
import type { Sale, SaleItem } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { DateCell, Money, Quantity } from "@/components/ui/display";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SaleFormDialog } from "@/components/features/sale-form";
import { PaymentFormDialog } from "@/components/features/payment-form";

function SaleDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [recording, setRecording] = useState(false);

  const { data: payload, loading, refetch } = useResource<{ data: Sale }>(`/sales/${params.id}`);
  const sale = payload?.data;

  if (loading && !sale) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (!sale) {
    return <div className="card p-8 text-center text-sm text-muted-foreground">{t("common.notFound")}</div>;
  }

  const itemColumns: Column<SaleItem>[] = [
    { key: "description", header: t("common.description"), render: (item) => item.description },
    {
      key: "quantity",
      header: t("common.quantity"),
      align: "right",
      render: (item) => <Quantity value={item.quantity} unit={item.unit} />,
    },
    {
      key: "unit_price",
      header: "Unit price",
      align: "right",
      render: (item) => <Money value={item.unit_price} currency={sale.currency} />,
    },
    {
      key: "total",
      header: t("common.total"),
      align: "right",
      render: (item) => <Money value={item.total} currency={sale.currency} />,
    },
  ];

  const paymentColumns: Column<NonNullable<Sale["payments"]>[number]>[] = [
    {
      key: "amount",
      header: t("common.amount"),
      align: "right",
      render: (payment) => <Money value={payment.amount} currency={payment.currency} />,
    },
    { key: "method", header: "Method", render: (payment) => payment.method },
    { key: "paid_at", header: "Paid at", render: (payment) => <DateCell value={payment.paid_at} /> },
    { key: "status", header: t("common.status"), render: (payment) => <StatusBadge status={payment.status} /> },
    { key: "reference", header: "Reference", render: (payment) => payment.reference ?? "—" },
  ];

  const stats: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("common.subtotal"), value: <Money value={sale.subtotal} currency={sale.currency} /> },
    { label: "Tax", value: <Money value={sale.tax_amount} currency={sale.currency} /> },
    { label: t("common.total"), value: <Money value={sale.total} currency={sale.currency} /> },
    { label: "Paid", value: <Money value={sale.paid_amount} currency={sale.currency} /> },
    {
      label: "Outstanding",
      value: <Money value={Math.max(sale.total - sale.paid_amount, 0)} currency={sale.currency} />,
    },
  ];

  return (
    <div>
      <button
        onClick={() => router.push("/app/sales")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("nav.sales")}
      </button>

      <PageHeader
        title={sale.invoice_number}
        subtitle={[sale.customer?.name ?? "Walk-in customer", formatDate(sale.sale_date)].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusBadge status={sale.payment_status} />
            <StatusBadge status={sale.status} />
            {can("payment.create") && (
              <Button variant="primary" onClick={() => setRecording(true)}>
                <CreditCard className="h-4 w-4" /> Record payment
              </Button>
            )}
            {can("sale.edit") && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> {t("action.edit")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1.5 text-lg font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {sale.notes && (
        <div className="card mt-4 p-4">
          <h2 className="mb-1 text-sm font-semibold">{t("common.notes")}</h2>
          <p className="text-sm text-muted-foreground">{sale.notes}</p>
        </div>
      )}

      <div className="card mt-4">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Line items</h2>
        </div>
        <DataTable
          columns={itemColumns}
          rows={sale.items ?? []}
          rowKey={(item) => item.id ?? `${item.description}-${item.quantity}`}
          emptyTitle={t("table.empty")}
          emptyHint="This invoice has no line items."
          caption="Line items"
        />
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Payments</h2>
          <span className="text-xs text-muted-foreground">
            <Money value={sale.paid_amount} currency={sale.currency} /> / <Money value={sale.total} currency={sale.currency} />
          </span>
        </div>
        <DataTable
          columns={paymentColumns}
          rows={sale.payments ?? []}
          rowKey={(payment) => payment.id}
          emptyTitle={t("table.empty")}
          emptyHint="No payments recorded against this invoice yet."
          caption="Payments"
        />
      </div>

      {editing && (
        <SaleFormDialog
          sale={sale}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast.success(t("form.saved"));
            void refetch();
          }}
        />
      )}

      {recording && (
        <PaymentFormDialog
          presetSaleId={sale.id}
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            toast.success(t("form.saved"));
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export default function SaleDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <SaleDetailContent />
    </Suspense>
  );
}
