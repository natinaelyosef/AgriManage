"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated } from "@/lib/api/hooks";
import { apiClient, ApiError } from "@/lib/api/client";
import type { Expense, Payment, Sale } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  direction: "in",
  amount: "",
  method: "cash",
  paid_at: "",
  reference: "",
  notes: "",
  link_type: "sale",
  link_id: "",
};

export function PaymentFormDialog({
  presetSaleId,
  presetExpenseId,
  onClose,
  onSaved,
}: {
  presetSaleId?: number | null;
  presetExpenseId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { items: sales } = usePaginated<Sale>("/sales", { per_page: 100 });
  const { items: expenses } = usePaginated<Expense>("/expenses", { per_page: 100 });

  const [form, setForm] = useState(() => ({
    ...EMPTY,
    paid_at: today(),
    direction: presetExpenseId && !presetSaleId ? "out" : "in",
    link_type: presetSaleId ? "sale" : presetExpenseId ? "expense" : "sale",
    link_id: String(presetSaleId ?? presetExpenseId ?? ""),
  }));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    apiClient.post<{ data: Payment }>("/payments", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.link_id) {
      setError(new ApiError("A payment must be linked to a sale or an expense.", 422));
      return;
    }
    const payload = {
      direction: form.direction,
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference || null,
      paid_at: form.paid_at || null,
      sale_id: form.link_type === "sale" ? Number(form.link_id) : null,
      expense_id: form.link_type === "expense" ? Number(form.link_id) : null,
      notes: form.notes || null,
    };
    try {
      await save.run(payload);
      onSaved();
    } catch (caught) {
      setError(caught as ApiError);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      description="New payments await manual verification before they affect balances."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="payment-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="payment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Direction" htmlFor="p-direction" error={fieldError(error, "direction")}>
          <Select id="p-direction" value={form.direction} onChange={set("direction")}>
            <option value="in">In (money received)</option>
            <option value="out">Out (money paid)</option>
          </Select>
        </Field>
        <Field label={t("common.amount")} htmlFor="p-amount" required error={fieldError(error, "amount")}>
          <Input id="p-amount" type="number" step="0.01" min="0.01" required value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="Method" htmlFor="p-method" required error={fieldError(error, "method")}>
          <Select id="p-method" required value={form.method} onChange={set("method")}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="telebirr">Telebirr</option>
            <option value="cbe_birr">CBE Birr</option>
            <option value="chapa">Chapa</option>
            <option value="mobile_money">Mobile Money</option>
          </Select>
        </Field>
        <Field label="Paid at" htmlFor="p-paid-at" error={fieldError(error, "paid_at")}>
          <Input id="p-paid-at" type="date" value={form.paid_at} onChange={set("paid_at")} />
        </Field>
        <Field label="Reference" htmlFor="p-reference" error={fieldError(error, "reference")}>
          <Input id="p-reference" value={form.reference} onChange={set("reference")} placeholder="TXN-0001" />
        </Field>
        <Field
          label="Link to"
          htmlFor="p-link"
          required
          hint="A payment must be linked to a sale or an expense. It stays pending until verified."
          error={fieldError(error, "sale_id") ?? fieldError(error, "expense_id")}
        >
          <div className="flex gap-2">
            <Select
              aria-label="Link type"
              value={form.link_type}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, link_type: event.target.value, link_id: "" }));
              }}
              className="w-32 shrink-0"
            >
              <option value="sale">Sale</option>
              <option value="expense">Expense</option>
            </Select>
            <Select id="p-link" required value={form.link_id} onChange={set("link_id")} className="flex-1">
              <option value="">Select…</option>
              {form.link_type === "sale"
                ? sales.map((sale) => (
                    <option key={sale.id} value={sale.id}>
                      {sale.invoice_number} — {sale.customer?.name ?? "Walk-in"}
                    </option>
                  ))
                : expenses.map((expense) => (
                    <option key={expense.id} value={expense.id}>
                      {expense.title}
                    </option>
                  ))}
            </Select>
          </div>
        </Field>
        <Field label={t("common.notes")} htmlFor="p-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="p-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
