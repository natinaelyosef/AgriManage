"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { InventoryItem, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const EMPTY = {
  name: "",
  sku: "",
  category: "other",
  unit: "",
  quantity: "",
  unit_cost: "",
  reorder_level: "",
  warehouse: "",
  supplier_name: "",
  expiry_date: "",
  status: "active",
  notes: "",
};

function toForm(item: InventoryItem): typeof EMPTY {
  return {
    name: item.name,
    sku: item.sku ?? "",
    category: item.category,
    unit: item.unit ?? "",
    quantity: item.quantity ? String(item.quantity) : "",
    unit_cost: item.unit_cost ? String(item.unit_cost) : "",
    reorder_level: item.reorder_level ? String(item.reorder_level) : "",
    warehouse: item.warehouse ?? "",
    supplier_name: item.supplier_name ?? "",
    expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : "",
    status: item.status,
    notes: item.notes ?? "",
  };
}

export function InventoryFormDialog({
  item,
  onClose,
  onSaved,
}: {
  item?: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [form, setForm] = useState(() => (item ? toForm(item) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    item
      ? apiClient.put<{ data: InventoryItem }>(`/inventory-items/${item.id}`, payload)
      : apiClient.post<{ data: InventoryItem }>("/inventory-items", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      sku: form.sku || null,
      category: form.category,
      unit: form.unit || null,
      quantity: form.quantity ? Number(form.quantity) : null,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      reorder_level: form.reorder_level ? Number(form.reorder_level) : null,
      warehouse: form.warehouse || null,
      supplier_name: form.supplier_name || null,
      expiry_date: form.expiry_date || null,
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
      title={item ? "Edit item" : "New inventory item"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="inventory-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="inventory-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="i-name" required error={fieldError(error, "name")}>
          <Input id="i-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label="SKU" htmlFor="i-sku" error={fieldError(error, "sku")}>
          <Input id="i-sku" value={form.sku} onChange={set("sku")} placeholder="FRT-001" />
        </Field>
        <Field label="Category" htmlFor="i-category" required error={fieldError(error, "category")}>
          <Select id="i-category" required value={form.category} onChange={set("category")}>
            {Object.entries(lookups?.inventory_categories ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.unit")} htmlFor="i-unit" error={fieldError(error, "unit")}>
          <Select id="i-unit" value={form.unit} onChange={set("unit")}>
            <option value="">—</option>
            {Object.entries(lookups?.units ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.quantity")} htmlFor="i-quantity" error={fieldError(error, "quantity")}>
          <Input id="i-quantity" type="number" step="0.001" min="0" value={form.quantity} onChange={set("quantity")} />
        </Field>
        <Field label="Unit cost" htmlFor="i-cost" error={fieldError(error, "unit_cost")}>
          <Input id="i-cost" type="number" step="0.01" min="0" value={form.unit_cost} onChange={set("unit_cost")} />
        </Field>
        <Field label="Reorder level" htmlFor="i-reorder" error={fieldError(error, "reorder_level")}>
          <Input id="i-reorder" type="number" step="0.001" min="0" value={form.reorder_level} onChange={set("reorder_level")} />
        </Field>
        <Field label="Warehouse" htmlFor="i-warehouse" error={fieldError(error, "warehouse")}>
          <Input id="i-warehouse" value={form.warehouse} onChange={set("warehouse")} />
        </Field>
        <Field label="Supplier" htmlFor="i-supplier" error={fieldError(error, "supplier_name")}>
          <Input id="i-supplier" value={form.supplier_name} onChange={set("supplier_name")} />
        </Field>
        <Field label="Expiry date" htmlFor="i-expiry" error={fieldError(error, "expiry_date")}>
          <Input id="i-expiry" type="date" value={form.expiry_date} onChange={set("expiry_date")} />
        </Field>
        <Field label={t("common.status")} htmlFor="i-status">
          <Select id="i-status" value={form.status} onChange={set("status")}>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="i-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="i-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
