"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Payment } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { PaymentFormDialog } from "@/components/features/payment-form";

function RejectDialog({
  payment,
  onClose,
  onSaved,
}: {
  payment: Payment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<ApiError | null>(null);

  const reject = useMutation((payload: { id: number; reason: string }) =>
    apiClient.post<{ data: Payment }>(`/payments/${payload.id}/reject`, { reason: payload.reason }),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await reject.run({ id: payment.id, reason });
      onSaved();
    } catch (caught) {
      setError(caught as ApiError);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Reject payment"
      description={`${payment.amount} ${payment.currency} · ${payment.reference ?? "no reference"}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="danger" form="reject-form" type="submit" loading={reject.pending}>
            Reject
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="reject-form" onSubmit={submit}>
        <Field label="Reason" htmlFor="reject-reason" required error={fieldError(error, "reason")}>
          <Textarea
            id="reject-reason"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this payment rejected?"
          />
        </Field>
      </form>
    </Modal>
  );
}

function PaymentsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-paid_at", filters: ["status", "direction", "from", "to"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Payment>("/payments", list.params);

  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState<Payment | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);

  const verify = useMutation((id: number) => apiClient.post<{ data: Payment }>(`/payments/${id}/verify`));

  const canVerify = (payment: Payment) => can("payment.verify") && payment.status === "pending";

  const columns: Column<Payment>[] = [
    {
      key: "direction",
      header: t("common.type"),
      render: (payment) => (
        <Badge tone={payment.direction === "in" ? "success" : "warning"}>
          {payment.direction === "in" ? "In" : "Out"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      align: "right",
      render: (payment) => (
        <Money
          value={payment.direction === "in" ? payment.amount : -payment.amount}
          currency={payment.currency}
          signed
        />
      ),
    },
    { key: "method", header: "Method", render: (payment) => payment.method },
    { key: "reference", header: "Reference", render: (payment) => payment.reference ?? "—" },
    {
      key: "sale",
      header: "Invoice",
      render: (payment) =>
        payment.sale ? (
          <Link href={`/app/sales/${payment.sale.id}`} className="font-mono text-xs hover:text-brand-700">
            {payment.sale.invoice_number}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "paid_at", header: "Paid at", render: (payment) => <DateCell value={payment.paid_at} /> },
    { key: "status", header: t("common.status"), render: (payment) => <StatusBadge status={payment.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (payment) =>
        canVerify(payment) ? (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setVerifying(payment)}
              aria-label="Verify"
              title="Verify"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRejecting(payment)}
              aria-label="Reject"
              title="Reject"
            >
              <XCircle className="h-3.5 w-3.5 text-critical-600" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.payments")}
        subtitle="Incoming and outgoing cash awaiting verification"
        actions={
          can("payment.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search payments…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: [
              { value: "pending", label: t("status.pending") },
              { value: "verified", label: t("status.verified") },
              { value: "rejected", label: t("status.rejected") },
            ],
          },
          {
            key: "direction",
            label: t("common.type"),
            options: [
              { value: "in", label: "In" },
              { value: "out", label: "Out" },
            ],
          },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label={t("common.from")}
              className="w-36"
              value={list.filters.from ?? ""}
              onChange={(event) => list.setFilter("from", event.target.value)}
            />
            <Input
              type="date"
              aria-label={t("common.to")}
              className="w-36"
              value={list.filters.to ?? ""}
              onChange={(event) => list.setFilter("to", event.target.value)}
            />
          </div>
        }
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(payment) => payment.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Record a payment against a sale or an expense to get started."
          caption={t("nav.payments")}
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
        <PaymentFormDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}

      <ConfirmDialog
        open={verifying !== null}
        onClose={() => setVerifying(null)}
        title="Verify payment"
        message={
          verifying
            ? `Verify the payment of ${verifying.amount} ${verifying.currency} via ${verifying.method}? This updates the linked balances.`
            : ""
        }
        confirmLabel="Verify"
        destructive={false}
        pending={verify.pending}
        onConfirm={async () => {
          if (!verifying) return;
          try {
            await verify.run(verifying.id);
            toast.success("Payment verified");
            setVerifying(null);
            void refetch();
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />

      {rejecting && (
        <RejectDialog
          payment={rejecting}
          onClose={() => setRejecting(null)}
          onSaved={() => {
            setRejecting(null);
            toast.success("Payment rejected");
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <PaymentsContent />
    </Suspense>
  );
}
