"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Expense, Farm, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  title: "",
  category: "other",
  description: "",
  amount: "",
  currency: "ETB",
  expense_date: "",
  payment_method: "cash",
  status: "pending",
  farm_id: "",
  supplier_name: "",
  receipt_url: "",
};

function toForm(expense: Expense): typeof EMPTY {
  return {
    title: expense.title,
    category: expense.category,
    description: expense.description ?? "",
    amount: String(expense.amount ?? ""),
    currency: expense.currency ?? "ETB",
    expense_date: expense.expense_date.slice(0, 10),
    payment_method: expense.payment_method ?? "cash",
    status: expense.status,
    farm_id: expense.farm_id ? String(expense.farm_id) : "",
    supplier_name: expense.supplier_name ?? "",
    receipt_url: "",
  };
}

export function ExpenseFormDialog({
  expense,
  onClose,
  onSaved,
}: {
  expense?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() =>
    expense ? toForm(expense) : { ...EMPTY, expense_date: today() },
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    expense
      ? apiClient.put<{ data: Expense }>(`/expenses/${expense.id}`, payload)
      : apiClient.post<{ data: Expense }>("/expenses", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      title: form.title,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
      currency: form.currency,
      expense_date: form.expense_date,
      payment_method: form.payment_method,
      status: form.status,
      farm_id: form.farm_id ? Number(form.farm_id) : null,
      supplier_name: form.supplier_name || null,
      receipt_url: form.receipt_url || null,
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
      title={expense ? "Edit expense" : "New expense"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="expense-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="expense-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="e-title" required className="sm:col-span-2" error={fieldError(error, "title")}>
          <Input id="e-title" required value={form.title} onChange={set("title")} />
        </Field>
        <Field label="Category" htmlFor="e-category" required error={fieldError(error, "category")}>
          <Select id="e-category" required value={form.category} onChange={set("category")}>
            {Object.entries(lookups?.expense_categories ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.amount")} htmlFor="e-amount" required error={fieldError(error, "amount")}>
          <Input id="e-amount" type="number" step="0.01" min="0" required value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label={t("common.date")} htmlFor="e-date" required error={fieldError(error, "expense_date")}>
          <Input id="e-date" type="date" required value={form.expense_date} onChange={set("expense_date")} />
        </Field>
        <Field label="Currency" htmlFor="e-currency" error={fieldError(error, "currency")}>
          <Select id="e-currency" value={form.currency} onChange={set("currency")}>
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Field label="Payment method" htmlFor="e-method" error={fieldError(error, "payment_method")}>
          <Select id="e-method" value={form.payment_method} onChange={set("payment_method")}>
            {Object.entries(lookups?.payment_methods ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="e-status" error={fieldError(error, "status")}>
          <Select id="e-status" value={form.status} onChange={set("status")}>
            <option value="pending">{t("status.pending")}</option>
            <option value="paid">{t("status.paid")}</option>
            <option value="approved">Approved</option>
            <option value="cancelled">{t("status.cancelled")}</option>
          </Select>
        </Field>
        <Field label="Farm" htmlFor="e-farm" error={fieldError(error, "farm_id")}>
          <Select id="e-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier" htmlFor="e-supplier" error={fieldError(error, "supplier_name")}>
          <Input id="e-supplier" value={form.supplier_name} onChange={set("supplier_name")} />
        </Field>
        <Field label="Receipt URL" htmlFor="e-receipt" className="sm:col-span-2" error={fieldError(error, "receipt_url")}>
          <Input id="e-receipt" type="url" value={form.receipt_url} onChange={set("receipt_url")} />
        </Field>
        <Field label={t("common.description")} htmlFor="e-description" className="sm:col-span-2" error={fieldError(error, "description")}>
          <Textarea id="e-description" value={form.description} onChange={set("description")} />
        </Field>
      </form>
    </Modal>
  );
}
