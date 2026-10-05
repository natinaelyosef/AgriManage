"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError, type Paginated } from "@/lib/api/client";
import type { CropPlan, Field as FieldRecord, Lookups, Season } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const EMPTY = {
  season_id: "",
  field_id: "",
  crop_id: "",
  variety: "",
  planned_area_hectares: "",
  planting_date: "",
  expected_harvest_date: "",
  expected_yield: "",
  yield_unit: "",
  seed_quantity: "",
  estimated_cost: "",
  status: "planned",
  notes: "",
};

function toForm(plan: CropPlan): typeof EMPTY {
  return {
    season_id: String(plan.season_id),
    field_id: String(plan.field_id),
    crop_id: String(plan.crop_id),
    variety: plan.variety ?? "",
    planned_area_hectares: String(plan.planned_area_hectares ?? ""),
    planting_date: plan.planting_date ? plan.planting_date.slice(0, 10) : "",
    expected_harvest_date: plan.expected_harvest_date ? plan.expected_harvest_date.slice(0, 10) : "",
    expected_yield: plan.expected_yield != null ? String(plan.expected_yield) : "",
    yield_unit: plan.yield_unit ?? "",
    seed_quantity: plan.seed_quantity != null ? String(plan.seed_quantity) : "",
    estimated_cost: plan.estimated_cost != null ? String(plan.estimated_cost) : "",
    status: plan.status,
    notes: plan.notes ?? "",
  };
}

export function PlanFormDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan?: CropPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");
  const { data: seasonsPayload } = useResource<Paginated<Season>>("/seasons", { per_page: 100 });
  const { data: fieldsPayload } = useResource<Paginated<FieldRecord>>("/fields", { per_page: 100 });

  const [form, setForm] = useState(() => (plan ? toForm(plan) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    plan
      ? apiClient.put<{ data: CropPlan }>(`/crop-plans/${plan.id}`, payload)
      : apiClient.post<{ data: CropPlan }>("/crop-plans", payload),
  );

  const seasons = seasonsPayload?.data ?? [];
  const fields = fieldsPayload?.data ?? [];
  const crops = lookups?.data.crops ?? [];
  const planStatuses = Object.entries(lookups?.data.statuses.plan ?? {});
  const unitEntries = Object.entries(lookups?.data.units ?? {});
  if (form.yield_unit && !unitEntries.some(([key]) => key === form.yield_unit)) {
    unitEntries.unshift([form.yield_unit, form.yield_unit]);
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      season_id: Number(form.season_id),
      field_id: Number(form.field_id),
      crop_id: Number(form.crop_id),
      variety: form.variety || null,
      planned_area_hectares: Number(form.planned_area_hectares) || 0,
      planting_date: form.planting_date || null,
      expected_harvest_date: form.expected_harvest_date || null,
      expected_yield: form.expected_yield ? Number(form.expected_yield) : null,
      yield_unit: form.yield_unit || null,
      seed_quantity: form.seed_quantity ? Number(form.seed_quantity) : null,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
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
      title={plan ? "Edit crop plan" : "New crop plan"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="plan-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="plan-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Season" htmlFor="p-season" required error={fieldError(error, "season_id")}>
          <Select id="p-season" required value={form.season_id} onChange={set("season_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Crop" htmlFor="p-crop" required error={fieldError(error, "crop_id")}>
          <Select id="p-crop" required value={form.crop_id} onChange={set("crop_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Field" htmlFor="p-field" required error={fieldError(error, "field_id")}>
          <Select id="p-field" required value={form.field_id} onChange={set("field_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
                {field.farm ? ` · ${field.farm.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variety" htmlFor="p-variety" error={fieldError(error, "variety")}>
          <Input id="p-variety" value={form.variety} onChange={set("variety")} placeholder="Quncho" />
        </Field>
        <Field
          label={`${t("common.area")} (ha)`}
          htmlFor="p-area"
          required
          error={fieldError(error, "planned_area_hectares")}
        >
          <Input
            id="p-area"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.planned_area_hectares}
            onChange={set("planned_area_hectares")}
          />
        </Field>
        <Field label={t("common.status")} htmlFor="p-status">
          <Select id="p-status" value={form.status} onChange={set("status")}>
            {planStatuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Planting date" htmlFor="p-planting" error={fieldError(error, "planting_date")}>
          <Input id="p-planting" type="date" value={form.planting_date} onChange={set("planting_date")} />
        </Field>
        <Field label="Expected harvest date" htmlFor="p-harvest" error={fieldError(error, "expected_harvest_date")}>
          <Input id="p-harvest" type="date" value={form.expected_harvest_date} onChange={set("expected_harvest_date")} />
        </Field>
        <Field label="Expected yield" htmlFor="p-expected" error={fieldError(error, "expected_yield")}>
          <Input
            id="p-expected"
            type="number"
            step="0.01"
            min="0"
            value={form.expected_yield}
            onChange={set("expected_yield")}
          />
        </Field>
        <Field label={t("common.unit")} htmlFor="p-unit" error={fieldError(error, "yield_unit")}>
          <Select id="p-unit" value={form.yield_unit} onChange={set("yield_unit")}>
            <option value="">—</option>
            {unitEntries.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seed quantity" htmlFor="p-seed" error={fieldError(error, "seed_quantity")}>
          <Input id="p-seed" type="number" step="0.01" min="0" value={form.seed_quantity} onChange={set("seed_quantity")} />
        </Field>
        <Field label="Estimated cost" htmlFor="p-cost" error={fieldError(error, "estimated_cost")}>
          <Input id="p-cost" type="number" step="0.01" min="0" value={form.estimated_cost} onChange={set("estimated_cost")} />
        </Field>
        <Field label={t("common.notes")} htmlFor="p-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="p-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
