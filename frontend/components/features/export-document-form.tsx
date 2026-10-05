"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Customer, ExportDocument, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { Money } from "@/components/ui/display";

const EMPTY = {
  product: "",
  quantity: "",
  unit_price: "",
  destination_country: "",
  unit: "quintal",
  transport_mode: "road",
  ship_date: "",
  customer_id: "",
  status: "draft",
  notes: "",
};

function toForm(doc: ExportDocument): typeof EMPTY {
  return {
    product: doc.product,
    quantity: String(doc.quantity),
    unit_price: String(doc.unit_price),
    destination_country: doc.destination_country,
    unit: doc.unit,
    transport_mode: doc.transport_mode,
    ship_date: doc.ship_date ? doc.ship_date.slice(0, 10) : "",
    customer_id: doc.customer_id ? String(doc.customer_id) : "",
    status: doc.status,
    notes: doc.notes ?? "",
  };
}

export function ExportDocumentFormDialog({
  document,
  onClose,
  onSaved,
}: {
  document: ExportDocument | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: customers } = usePaginated<Customer>("/customers", { per_page: 100 });

  const [form, setForm] = useState(() => (document ? toForm(document) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    document
      ? apiClient.put<{ data: ExportDocument }>(`/export-documents/${document.id}`, payload)
      : apiClient.post<{ data: ExportDocument }>("/export-documents", payload),
  );

  const total = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      product: form.product,
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price),
      destination_country: form.destination_country,
      unit: form.unit || null,
      transport_mode: form.transport_mode || null,
      ship_date: form.ship_date || null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      status: form.status,
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
      title={document ? `Edit ${document.doc_number}` : "New export document"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="export-document-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="export-document-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {document && (
          <Field label="Doc number" htmlFor="ed-doc-number">
            <Input id="ed-doc-number" value={document.doc_number} readOnly />
          </Field>
        )}
        <Field label="Product" htmlFor="ed-product" required error={fieldError(error, "product")}>
          <Input id="ed-product" required value={form.product} onChange={set("product")} />
        </Field>
        <Field label={t("common.quantity")} htmlFor="ed-quantity" required error={fieldError(error, "quantity")}>
          <Input
            id="ed-quantity"
            type="number"
            step="any"
            min="0.001"
            required
            value={form.quantity}
            onChange={set("quantity")}
          />
        </Field>
        <Field label="Unit price" htmlFor="ed-unit-price" required error={fieldError(error, "unit_price")}>
          <Input
            id="ed-unit-price"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.unit_price}
            onChange={set("unit_price")}
          />
        </Field>
        <Field label="Destination country" htmlFor="ed-destination" required error={fieldError(error, "destination_country")}>
          <Input id="ed-destination" required value={form.destination_country} onChange={set("destination_country")} />
        </Field>
        <Field label={t("common.unit")} htmlFor="ed-unit" error={fieldError(error, "unit")}>
          <Select id="ed-unit" value={form.unit} onChange={set("unit")}>
            {Object.entries(lookups?.units ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Transport mode" htmlFor="ed-transport" error={fieldError(error, "transport_mode")}>
          <Select id="ed-transport" value={form.transport_mode} onChange={set("transport_mode")}>
            {Object.entries(lookups?.transport_modes ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ship date" htmlFor="ed-ship-date" error={fieldError(error, "ship_date")}>
          <Input id="ed-ship-date" type="date" value={form.ship_date} onChange={set("ship_date")} />
        </Field>
        <Field label="Customer" htmlFor="ed-customer" error={fieldError(error, "customer_id")}>
          <Select id="ed-customer" value={form.customer_id} onChange={set("customer_id")}>
            <option value="">—</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="ed-status" error={fieldError(error, "status")}>
          <Select id="ed-status" value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.export_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t("common.notes")}
          htmlFor="ed-notes"
          className="sm:col-span-2"
          error={fieldError(error, "notes")}
        >
          <Textarea id="ed-notes" value={form.notes} onChange={set("notes")} />
        </Field>

        <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm font-semibold sm:col-span-2">
          <span>{t("common.total")}</span>
          <Money value={total} />
        </div>
      </form>
    </Modal>
  );
}
