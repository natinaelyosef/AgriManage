"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError, type Paginated } from "@/lib/api/client";
import type { Crop, CropPlan, Field as FieldRecord, HarvestBatch, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const EMPTY = {
  harvest_date: "",
  quantity: "",
  unit: "",
  crop_plan_id: "",
  field_id: "",
  crop_id: "",
  moisture_percent: "",
  grade: "",
  quality_status: "pending",
  status: "recorded",
  location: "",
  unit_price: "",
  notes: "",
};

function toForm(batch: HarvestBatch): typeof EMPTY {
  return {
    harvest_date: batch.harvest_date ? batch.harvest_date.slice(0, 10) : "",
    quantity: String(batch.quantity ?? ""),
    unit: batch.unit ?? "",
    crop_plan_id: batch.crop_plan_id != null ? String(batch.crop_plan_id) : "",
    field_id: batch.field_id != null ? String(batch.field_id) : "",
    crop_id: batch.crop_id != null ? String(batch.crop_id) : "",
    moisture_percent: batch.moisture_percent != null ? String(batch.moisture_percent) : "",
    grade: batch.grade ?? "",
    quality_status: batch.quality_status,
    status: batch.status,
    location: batch.location ?? "",
    unit_price: batch.unit_price != null ? String(batch.unit_price) : "",
    notes: batch.notes ?? "",
  };
}

export function HarvestFormDialog({
  batch,
  onClose,
  onSaved,
}: {
  batch?: HarvestBatch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");
  const { data: cropsPayload } = useResource<Paginated<Crop>>("/crops", { per_page: 100 });
  const { data: fieldsPayload } = useResource<Paginated<FieldRecord>>("/fields", { per_page: 100 });
  const { data: plansPayload } = useResource<Paginated<CropPlan>>("/crop-plans", { per_page: 100 });

  const [form, setForm] = useState(() => (batch ? toForm(batch) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const crops = cropsPayload?.data ?? [];
  const fields = fieldsPayload?.data ?? [];
  const plans = plansPayload?.data ?? [];

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const onPlanChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const selected = plans.find((item) => String(item.id) === value);
    setForm((prev) => ({
      ...prev,
      crop_plan_id: value,
      field_id: prev.field_id || (selected?.field_id != null ? String(selected.field_id) : ""),
      crop_id: prev.crop_id || (selected?.crop_id != null ? String(selected.crop_id) : ""),
      unit: prev.unit || (selected?.yield_unit ? selected.yield_unit : ""),
    }));
  };

  const save = useMutation(async (payload: Record<string, unknown>) =>
    batch
      ? apiClient.put<{ data: HarvestBatch }>(`/harvest-batches/${batch.id}`, payload)
      : apiClient.post<{ data: HarvestBatch }>("/harvest-batches", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const plan = plans.find((item) => String(item.id) === form.crop_plan_id);
    const fieldId = form.field_id || (plan?.field_id != null ? String(plan.field_id) : "");
    const field = fields.find((item) => String(item.id) === fieldId);
    const cropId = form.crop_id || (plan?.crop_id != null ? String(plan.crop_id) : "");
    const payload = {
      harvest_date: form.harvest_date,
      quantity: Number(form.quantity) || 0,
      unit: form.unit || null,
      crop_plan_id: form.crop_plan_id ? Number(form.crop_plan_id) : null,
      field_id: fieldId ? Number(fieldId) : null,
      farm_id: field?.farm_id ?? plan?.field?.farm_id ?? null,
      crop_id: cropId ? Number(cropId) : null,
      moisture_percent: form.moisture_percent ? Number(form.moisture_percent) : null,
      grade: form.grade || null,
      quality_status: form.quality_status,
      status: form.status,
      location: form.location || null,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      notes: form.notes || null,
    };
    try {
      await save.run(payload);
      onSaved();
    } catch (caught) {
      setError(caught as ApiError);
    }
  };

  const qualityStatuses = Object.entries(lookups?.data.statuses.quality ?? {});
  const harvestStatuses = Object.entries(lookups?.data.statuses.harvest ?? {});
  const unitEntries = Object.entries(lookups?.data.units ?? {});
  if (form.unit && !unitEntries.some(([key]) => key === form.unit)) {
    unitEntries.unshift([form.unit, form.unit]);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={batch ? "Edit harvest batch" : "New harvest batch"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="harvest-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="harvest-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.date")} htmlFor="h-date" required error={fieldError(error, "harvest_date")}>
          <Input id="h-date" type="date" required value={form.harvest_date} onChange={set("harvest_date")} />
        </Field>
        <Field label={t("common.quantity")} htmlFor="h-quantity" required error={fieldError(error, "quantity")}>
          <Input
            id="h-quantity"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.quantity}
            onChange={set("quantity")}
          />
        </Field>
        <Field label={t("common.unit")} htmlFor="h-unit" error={fieldError(error, "unit")}>
          <Select id="h-unit" value={form.unit} onChange={set("unit")}>
            <option value="">—</option>
            {unitEntries.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Crop" htmlFor="h-crop" error={fieldError(error, "crop_id")}>
          <Select id="h-crop" value={form.crop_id} onChange={set("crop_id")}>
            <option value="">{t("common.none")}</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Crop plan" htmlFor="h-plan" error={fieldError(error, "crop_plan_id")}>
          <Select id="h-plan" value={form.crop_plan_id} onChange={onPlanChange}>
            <option value="">{t("common.none")}</option>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.crop?.name ?? "Plan"} — {item.field?.name ?? "—"}
                {item.variety ? ` (${item.variety})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Field" htmlFor="h-field" error={fieldError(error, "field_id")}>
          <Select id="h-field" value={form.field_id} onChange={set("field_id")}>
            <option value="">{t("common.none")}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
                {field.farm ? ` · ${field.farm.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Moisture %" htmlFor="h-moisture" error={fieldError(error, "moisture_percent")}>
          <Input
            id="h-moisture"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={form.moisture_percent}
            onChange={set("moisture_percent")}
          />
        </Field>
        <Field label="Grade" htmlFor="h-grade" error={fieldError(error, "grade")}>
          <Input id="h-grade" value={form.grade} onChange={set("grade")} placeholder="A" />
        </Field>
        <Field label="Quality" htmlFor="h-quality" error={fieldError(error, "quality_status")}>
          <Select id="h-quality" value={form.quality_status} onChange={set("quality_status")}>
            {qualityStatuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="h-status" error={fieldError(error, "status")}>
          <Select id="h-status" value={form.status} onChange={set("status")}>
            {harvestStatuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location" htmlFor="h-location" error={fieldError(error, "location")}>
          <Input id="h-location" value={form.location} onChange={set("location")} placeholder="Warehouse A" />
        </Field>
        <Field label="Unit price" htmlFor="h-price" error={fieldError(error, "unit_price")}>
          <Input id="h-price" type="number" step="0.01" min="0" value={form.unit_price} onChange={set("unit_price")} />
        </Field>
        <Field label={t("common.notes")} htmlFor="h-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="h-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
