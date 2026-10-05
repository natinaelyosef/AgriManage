"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Customer, HarvestBatch, Lookups, Sale, SaleItem } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { Money } from "@/components/ui/display";

interface Line {
  uid: number;
  harvest_batch_id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

let lineCounter = 0;

function nextUid(): number {
  lineCounter += 1;
  return lineCounter;
}

function emptyLine(): Line {
  return { uid: nextUid(), harvest_batch_id: "", description: "", quantity: "", unit: "quintal", unit_price: "" };
}

function toLine(item: SaleItem): Line {
  return {
    uid: nextUid(),
    harvest_batch_id: item.harvest_batch_id ? String(item.harvest_batch_id) : "",
    description: item.description,
    quantity: String(item.quantity),
    unit: item.unit ?? "",
    unit_price: String(item.unit_price),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  customer_id: "",
  sale_date: "",
  tax_amount: "",
  currency: "ETB",
  notes: "",
};

function toForm(sale: Sale): typeof EMPTY {
  return {
    customer_id: sale.customer_id ? String(sale.customer_id) : "",
    sale_date: sale.sale_date.slice(0, 10),
    tax_amount: sale.tax_amount ? String(sale.tax_amount) : "",
    currency: sale.currency,
    notes: sale.notes ?? "",
  };
}

export function SaleFormDialog({
  sale,
  onClose,
  onSaved,
}: {
  sale?: Sale | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: customers } = usePaginated<Customer>("/customers", { per_page: 100 });
  const { items: batches } = usePaginated<HarvestBatch>("/harvest-batches", { per_page: 100 });

  const [form, setForm] = useState(() => (sale ? toForm(sale) : { ...EMPTY, sale_date: today() }));
  const [lines, setLines] = useState<Line[]>(() =>
    sale?.items && sale.items.length > 0 ? sale.items.map(toLine) : [emptyLine()],
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const setLine = (uid: number, key: keyof Line) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setLines((prev) => prev.map((line) => (line.uid === uid ? { ...line, [key]: event.target.value } : line)));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    sale
      ? apiClient.put<{ data: Sale }>(`/sales/${sale.id}`, payload)
      : apiClient.post<{ data: Sale }>("/sales", payload),
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );
  const tax = Number(form.tax_amount) || 0;
  const total = subtotal + tax;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      sale_date: form.sale_date,
      tax_amount: tax,
      currency: form.currency,
      notes: form.notes || null,
      items: lines.map((line) => ({
        harvest_batch_id: line.harvest_batch_id ? Number(line.harvest_batch_id) : null,
        description: line.description,
        quantity: Number(line.quantity),
        unit: line.unit || null,
        unit_price: Number(line.unit_price),
      })),
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
      title={sale ? `Edit ${sale.invoice_number}` : "New sale"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="sale-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="sale-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer" htmlFor="s-customer" hint="Leave blank for walk-in sales" error={fieldError(error, "customer_id")}>
          <Select id="s-customer" value={form.customer_id} onChange={set("customer_id")}>
            <option value="">Walk-in customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.date")} htmlFor="s-date" required error={fieldError(error, "sale_date")}>
          <Input id="s-date" type="date" required value={form.sale_date} onChange={set("sale_date")} />
        </Field>
        <Field label="Tax amount" htmlFor="s-tax" error={fieldError(error, "tax_amount")}>
          <Input id="s-tax" type="number" step="0.01" min="0" value={form.tax_amount} onChange={set("tax_amount")} />
        </Field>
        <Field label="Currency" htmlFor="s-currency" error={fieldError(error, "currency")}>
          <Select id="s-currency" value={form.currency} onChange={set("currency")}>
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="s-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="s-notes" value={form.notes} onChange={set("notes")} />
        </Field>

        <div className="sm:col-span-2">
          <p className="label">Line items</p>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.uid} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Description"
                    htmlFor={`s-line-desc-${line.uid}`}
                    required
                    className="sm:col-span-2"
                    error={fieldError(error, `items.${index}.description`)}
                  >
                    <Input
                      id={`s-line-desc-${line.uid}`}
                      required
                      value={line.description}
                      onChange={setLine(line.uid, "description")}
                    />
                  </Field>
                  <Field
                    label={t("common.quantity")}
                    htmlFor={`s-line-qty-${line.uid}`}
                    required
                    error={fieldError(error, `items.${index}.quantity`)}
                  >
                    <Input
                      id={`s-line-qty-${line.uid}`}
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={line.quantity}
                      onChange={setLine(line.uid, "quantity")}
                    />
                  </Field>
                  <Field label={t("common.unit")} htmlFor={`s-line-unit-${line.uid}`} error={fieldError(error, `items.${index}.unit`)}>
                    <Select id={`s-line-unit-${line.uid}`} value={line.unit} onChange={setLine(line.uid, "unit")}>
                      <option value="">—</option>
                      {Object.entries(lookups?.units ?? {}).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Unit price"
                    htmlFor={`s-line-price-${line.uid}`}
                    required
                    error={fieldError(error, `items.${index}.unit_price`)}
                  >
                    <Input
                      id={`s-line-price-${line.uid}`}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={line.unit_price}
                      onChange={setLine(line.uid, "unit_price")}
                    />
                  </Field>
                  <Field
                    label="Harvest batch"
                    htmlFor={`s-line-batch-${line.uid}`}
                    error={fieldError(error, `items.${index}.harvest_batch_id`)}
                  >
                    <Select id={`s-line-batch-${line.uid}`} value={line.harvest_batch_id} onChange={setLine(line.uid, "harvest_batch_id")}>
                      <option value="">—</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_number}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Row total:{" "}
                    <span className="font-semibold text-foreground">
                      <Money value={(Number(line.quantity) || 0) * (Number(line.unit_price) || 0)} currency={form.currency} />
                    </span>
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((item) => item.uid !== line.uid))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-critical-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            className="mt-3"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>

        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 sm:col-span-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("common.subtotal")}</span>
            <Money value={subtotal} currency={form.currency} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <Money value={tax} currency={form.currency} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold">
            <span>{t("common.total")}</span>
            <Money value={total} currency={form.currency} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
