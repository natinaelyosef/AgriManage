"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError, type Paginated } from "@/lib/api/client";
import type { Activity, CropPlan, Field as FieldRecord, Lookups, Worker } from "@/lib/api/types";
import { titleCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const PRIORITIES = ["low", "medium", "high", "urgent"];

const EMPTY = {
  title: "",
  type: "",
  description: "",
  status: "pending",
  priority: "medium",
  scheduled_date: "",
  crop_plan_id: "",
  field_id: "",
  assigned_worker_id: "",
  labor_hours: "",
  quantity: "",
  unit: "",
  cost: "",
  notes: "",
};

function toForm(activity: Activity): typeof EMPTY {
  return {
    title: activity.title,
    type: activity.type,
    description: activity.description ?? "",
    status: activity.status,
    priority: activity.priority,
    scheduled_date: activity.scheduled_date ? activity.scheduled_date.slice(0, 10) : "",
    crop_plan_id: activity.crop_plan_id != null ? String(activity.crop_plan_id) : "",
    field_id: activity.field_id != null ? String(activity.field_id) : "",
    assigned_worker_id: activity.assigned_worker_id != null ? String(activity.assigned_worker_id) : "",
    labor_hours: activity.labor_hours != null ? String(activity.labor_hours) : "",
    quantity: activity.quantity != null ? String(activity.quantity) : "",
    unit: activity.unit ?? "",
    cost: activity.cost != null ? String(activity.cost) : "",
    notes: activity.notes ?? "",
  };
}

export function ActivityFormDialog({
  activity,
  onClose,
  onSaved,
}: {
  activity?: Activity | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");
  const { data: fieldsPayload } = useResource<Paginated<FieldRecord>>("/fields", { per_page: 100 });
  const { data: workersPayload } = useResource<Paginated<Worker>>("/workers", { per_page: 100 });
  const { data: plansPayload } = useResource<Paginated<CropPlan>>("/crop-plans", { per_page: 100 });

  const [form, setForm] = useState(() => (activity ? toForm(activity) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const fields = fieldsPayload?.data ?? [];
  const workers = workersPayload?.data ?? [];
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
    }));
  };

  const save = useMutation(async (payload: Record<string, unknown>) =>
    activity
      ? apiClient.put<{ data: Activity }>(`/activities/${activity.id}`, payload)
      : apiClient.post<{ data: Activity }>("/activities", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const plan = plans.find((item) => String(item.id) === form.crop_plan_id);
    const fieldId = form.field_id || (plan?.field_id != null ? String(plan.field_id) : "");
    const field = fields.find((item) => String(item.id) === fieldId);
    const payload = {
      title: form.title,
      type: form.type,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      scheduled_date: form.scheduled_date || null,
      crop_plan_id: form.crop_plan_id ? Number(form.crop_plan_id) : null,
      field_id: fieldId ? Number(fieldId) : null,
      farm_id: field?.farm_id ?? plan?.field?.farm_id ?? null,
      assigned_worker_id: form.assigned_worker_id ? Number(form.assigned_worker_id) : null,
      labor_hours: form.labor_hours ? Number(form.labor_hours) : null,
      quantity: form.quantity ? Number(form.quantity) : null,
      unit: form.unit || null,
      cost: form.cost ? Number(form.cost) : null,
      notes: form.notes || null,
    };
    try {
      await save.run(payload);
      onSaved();
    } catch (caught) {
      setError(caught as ApiError);
    }
  };

  const activityTypes = Object.entries(lookups?.data.activity_types ?? {});
  const activityStatuses = Object.entries(lookups?.data.statuses.activity ?? {});
  const unitEntries = Object.entries(lookups?.data.units ?? {});
  if (form.unit && !unitEntries.some(([key]) => key === form.unit)) {
    unitEntries.unshift([form.unit, form.unit]);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={activity ? "Edit activity" : "New activity"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="activity-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="activity-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="a-title" required className="sm:col-span-2" error={fieldError(error, "title")}>
          <Input id="a-title" required value={form.title} onChange={set("title")} />
        </Field>
        <Field label={t("common.type")} htmlFor="a-type" required error={fieldError(error, "type")}>
          <Select id="a-type" required value={form.type} onChange={set("type")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {activityTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="a-status">
          <Select id="a-status" value={form.status} onChange={set("status")}>
            {activityStatuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="a-priority" error={fieldError(error, "priority")}>
          <Select id="a-priority" value={form.priority} onChange={set("priority")}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {titleCase(priority)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scheduled date" htmlFor="a-date" error={fieldError(error, "scheduled_date")}>
          <Input id="a-date" type="date" value={form.scheduled_date} onChange={set("scheduled_date")} />
        </Field>
        <Field label="Crop plan" htmlFor="a-plan" error={fieldError(error, "crop_plan_id")}>
          <Select id="a-plan" value={form.crop_plan_id} onChange={onPlanChange}>
            <option value="">{t("common.none")}</option>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.crop?.name ?? "Plan"} — {item.field?.name ?? "—"}
                {item.variety ? ` (${item.variety})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Field" htmlFor="a-field" error={fieldError(error, "field_id")}>
          <Select id="a-field" value={form.field_id} onChange={set("field_id")}>
            <option value="">{t("common.none")}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
                {field.farm ? ` · ${field.farm.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Worker" htmlFor="a-worker" error={fieldError(error, "assigned_worker_id")}>
          <Select id="a-worker" value={form.assigned_worker_id} onChange={set("assigned_worker_id")}>
            <option value="">{t("common.none")}</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Labor hours" htmlFor="a-hours" error={fieldError(error, "labor_hours")}>
          <Input id="a-hours" type="number" step="0.5" min="0" value={form.labor_hours} onChange={set("labor_hours")} />
        </Field>
        <Field label={t("common.quantity")} htmlFor="a-quantity" error={fieldError(error, "quantity")}>
          <Input id="a-quantity" type="number" step="0.01" min="0" value={form.quantity} onChange={set("quantity")} />
        </Field>
        <Field label={t("common.unit")} htmlFor="a-unit" error={fieldError(error, "unit")}>
          <Select id="a-unit" value={form.unit} onChange={set("unit")}>
            <option value="">—</option>
            {unitEntries.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.amount")} htmlFor="a-cost" error={fieldError(error, "cost")}>
          <Input id="a-cost" type="number" step="0.01" min="0" value={form.cost} onChange={set("cost")} />
        </Field>
        <Field label={t("common.description")} htmlFor="a-desc" className="sm:col-span-2" error={fieldError(error, "description")}>
          <Textarea id="a-desc" value={form.description} onChange={set("description")} />
        </Field>
        <Field label={t("common.notes")} htmlFor="a-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="a-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
