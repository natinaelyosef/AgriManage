"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type {
  CropPlan,
  Field as FieldRecord,
  InventoryItem,
  Lookups,
  Treatment,
  Worker,
} from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const DOSE_UNITS = ["kg/ha", "liter/ha", "g/ha", "kg", "liter"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  field_id: "",
  crop_plan_id: "",
  applied_date: "",
  category: "",
  product_name: "",
  dose: "",
  dose_unit: "",
  method: "",
  target: "",
  pre_harvest_interval_days: "",
  inventory_item_id: "",
  quantity_used: "",
  cost: "",
  performed_by: "",
  notes: "",
};

function toForm(treatment: Treatment): typeof EMPTY {
  return {
    field_id: treatment.field_id != null ? String(treatment.field_id) : "",
    crop_plan_id: treatment.crop_plan_id != null ? String(treatment.crop_plan_id) : "",
    applied_date: treatment.applied_date ? treatment.applied_date.slice(0, 10) : "",
    category: treatment.category,
    product_name: treatment.product_name,
    dose: treatment.dose != null ? String(treatment.dose) : "",
    dose_unit: treatment.dose_unit ?? "",
    method: treatment.method ?? "",
    target: treatment.target ?? "",
    pre_harvest_interval_days:
      treatment.pre_harvest_interval_days != null ? String(treatment.pre_harvest_interval_days) : "",
    inventory_item_id: treatment.inventory_item_id != null ? String(treatment.inventory_item_id) : "",
    quantity_used: treatment.quantity_used != null ? String(treatment.quantity_used) : "",
    cost: treatment.cost != null ? String(treatment.cost) : "",
    performed_by: treatment.performed_by != null ? String(treatment.performed_by) : "",
    notes: treatment.notes ?? "",
  };
}

export function TreatmentFormDialog({
  treatment,
  onClose,
  onSaved,
}: {
  treatment: Treatment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: fields } = usePaginated<FieldRecord>("/fields", { per_page: 100 });
  const { items: plans } = usePaginated<CropPlan>("/crop-plans", { per_page: 100 });
  const { items: inventoryItems } = usePaginated<InventoryItem>("/inventory-items", { per_page: 100 });
  const { items: workers } = usePaginated<Worker>("/workers", { per_page: 100 });

  const [form, setForm] = useState(() =>
    treatment ? toForm(treatment) : { ...EMPTY, applied_date: today() },
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    treatment
      ? apiClient.put<{ data: Treatment }>(`/treatments/${treatment.id}`, payload)
      : apiClient.post<{ data: Treatment }>("/treatments", payload),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      field_id: Number(form.field_id),
      crop_plan_id: form.crop_plan_id ? Number(form.crop_plan_id) : null,
      applied_date: form.applied_date,
      category: form.category,
      product_name: form.product_name,
      dose: form.dose ? Number(form.dose) : null,
      dose_unit: form.dose_unit || null,
      method: form.method || null,
      target: form.target || null,
      pre_harvest_interval_days: form.pre_harvest_interval_days
        ? Number(form.pre_harvest_interval_days)
        : null,
      inventory_item_id: form.inventory_item_id ? Number(form.inventory_item_id) : null,
      quantity_used: form.quantity_used ? Number(form.quantity_used) : null,
      cost: form.cost ? Number(form.cost) : null,
      performed_by: form.performed_by ? Number(form.performed_by) : null,
      notes: form.notes || null,
    };
    try {
      await save.run(payload);
      onSaved();
    } catch (caught) {
      setError(caught as ApiError);
    }
  };

  const methodEntries = Object.entries(lookups?.treatment_methods ?? {});
  if (form.method && !methodEntries.some(([key]) => key === form.method)) {
    methodEntries.unshift([form.method, form.method]);
  }
  const unitEntries = [...DOSE_UNITS];
  if (form.dose_unit && !unitEntries.includes(form.dose_unit)) {
    unitEntries.unshift(form.dose_unit);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={treatment ? "Edit treatment" : "New treatment"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="treatment-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="treatment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="t-product" required error={fieldError(error, "product_name")}>
          <Input id="t-product" required value={form.product_name} onChange={set("product_name")} />
        </Field>
        <Field label="Category" htmlFor="t-category" required error={fieldError(error, "category")}>
          <Select id="t-category" required value={form.category} onChange={set("category")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {Object.entries(lookups?.treatment_categories ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Field" htmlFor="t-field" required error={fieldError(error, "field_id")}>
          <Select id="t-field" required value={form.field_id} onChange={set("field_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
                {field.farm ? ` · ${field.farm.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.date")} htmlFor="t-date" required error={fieldError(error, "applied_date")}>
          <Input id="t-date" type="date" required value={form.applied_date} onChange={set("applied_date")} />
        </Field>
        <Field label="Crop plan" htmlFor="t-plan" error={fieldError(error, "crop_plan_id")}>
          <Select id="t-plan" value={form.crop_plan_id} onChange={set("crop_plan_id")}>
            <option value="">{t("common.none")}</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.crop?.name ?? "Plan"} — {plan.field?.name ?? "—"}
                {plan.variety ? ` (${plan.variety})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Method" htmlFor="t-method" error={fieldError(error, "method")}>
          <Select id="t-method" value={form.method} onChange={set("method")}>
            <option value="">—</option>
            {methodEntries.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dose" htmlFor="t-dose" error={fieldError(error, "dose")}>
          <Input id="t-dose" type="number" step="0.01" min="0" value={form.dose} onChange={set("dose")} />
        </Field>
        <Field label="Dose unit" htmlFor="t-dose-unit" error={fieldError(error, "dose_unit")}>
          <Select id="t-dose-unit" value={form.dose_unit} onChange={set("dose_unit")}>
            <option value="">—</option>
            {unitEntries.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Target" htmlFor="t-target" error={fieldError(error, "target")}>
          <Input id="t-target" value={form.target} onChange={set("target")} placeholder="Aphids, blight…" />
        </Field>
        <Field
          label="Pre-harvest interval (days)"
          htmlFor="t-phi"
          error={fieldError(error, "pre_harvest_interval_days")}
        >
          <Input
            id="t-phi"
            type="number"
            step="1"
            min="0"
            value={form.pre_harvest_interval_days}
            onChange={set("pre_harvest_interval_days")}
          />
        </Field>
        <Field label="Inventory item" htmlFor="t-inventory" error={fieldError(error, "inventory_item_id")}>
          <Select id="t-inventory" value={form.inventory_item_id} onChange={set("inventory_item_id")}>
            <option value="">{t("common.none")}</option>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity used" htmlFor="t-quantity" error={fieldError(error, "quantity_used")}>
          <Input
            id="t-quantity"
            type="number"
            step="0.01"
            min="0"
            value={form.quantity_used}
            onChange={set("quantity_used")}
          />
        </Field>
        <Field label={t("common.amount")} htmlFor="t-cost" error={fieldError(error, "cost")}>
          <Input id="t-cost" type="number" step="0.01" min="0" value={form.cost} onChange={set("cost")} />
        </Field>
        <Field label="Worker" htmlFor="t-worker" error={fieldError(error, "performed_by")}>
          <Select id="t-worker" value={form.performed_by} onChange={set("performed_by")}>
            <option value="">{t("common.none")}</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="t-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="t-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
