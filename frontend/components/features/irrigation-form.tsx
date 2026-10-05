"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Field as FieldRecord, IrrigationEvent, Lookups, Worker } from "@/lib/api/types";
import { titleCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  field_id: "",
  farm_id: "",
  irrigation_date: "",
  method: "",
  source: "",
  duration_minutes: "",
  volume_m3: "",
  cost: "",
  performed_by: "",
  notes: "",
};

function toForm(event: IrrigationEvent): typeof EMPTY {
  return {
    field_id: event.field_id != null ? String(event.field_id) : "",
    farm_id: event.farm_id != null ? String(event.farm_id) : "",
    irrigation_date: event.irrigation_date ? event.irrigation_date.slice(0, 10) : "",
    method: event.method ?? "",
    source: event.source ?? "",
    duration_minutes: event.duration_minutes != null ? String(event.duration_minutes) : "",
    volume_m3: event.volume_m3 != null ? String(event.volume_m3) : "",
    cost: event.cost != null ? String(event.cost) : "",
    performed_by: event.performed_by != null ? String(event.performed_by) : "",
    notes: event.notes ?? "",
  };
}

export function IrrigationFormDialog({
  event,
  onClose,
  onSaved,
}: {
  event: IrrigationEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: fields } = usePaginated<FieldRecord>("/fields", { per_page: 100 });
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { items: workers } = usePaginated<Worker>("/workers", { per_page: 100 });

  const [form, setForm] = useState(() =>
    event ? toForm(event) : { ...EMPTY, irrigation_date: today() },
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    event
      ? apiClient.put<{ data: IrrigationEvent }>(`/irrigation-events/${event.id}`, payload)
      : apiClient.post<{ data: IrrigationEvent }>("/irrigation-events", payload),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      field_id: Number(form.field_id),
      farm_id: form.farm_id ? Number(form.farm_id) : null,
      irrigation_date: form.irrigation_date,
      method: form.method,
      source: form.source || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      volume_m3: form.volume_m3 ? Number(form.volume_m3) : null,
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

  const methodEntries = Object.entries(lookups?.irrigation_methods ?? {});
  if (form.method && !methodEntries.some(([key]) => key === form.method)) {
    methodEntries.unshift([form.method, titleCase(form.method)]);
  }
  const sourceEntries = Object.entries(lookups?.irrigation_sources ?? {});
  if (form.source && !sourceEntries.some(([key]) => key === form.source)) {
    sourceEntries.unshift([form.source, titleCase(form.source)]);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={event ? "Edit irrigation event" : "New irrigation event"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="irrigation-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="irrigation-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Field" htmlFor="i-field" required error={fieldError(error, "field_id")}>
          <Select id="i-field" required value={form.field_id} onChange={set("field_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
                {field.farm ? ` · ${field.farm.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Farm" htmlFor="i-farm" error={fieldError(error, "farm_id")}>
          <Select id="i-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.date")} htmlFor="i-date" required error={fieldError(error, "irrigation_date")}>
          <Input id="i-date" type="date" required value={form.irrigation_date} onChange={set("irrigation_date")} />
        </Field>
        <Field label="Method" htmlFor="i-method" required error={fieldError(error, "method")}>
          <Select id="i-method" required value={form.method} onChange={set("method")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {methodEntries.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source" htmlFor="i-source" error={fieldError(error, "source")}>
          <Select id="i-source" value={form.source} onChange={set("source")}>
            <option value="">—</option>
            {sourceEntries.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Worker" htmlFor="i-worker" error={fieldError(error, "performed_by")}>
          <Select id="i-worker" value={form.performed_by} onChange={set("performed_by")}>
            <option value="">{t("common.none")}</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duration (min)" htmlFor="i-duration" error={fieldError(error, "duration_minutes")}>
          <Input
            id="i-duration"
            type="number"
            step="1"
            min="0"
            value={form.duration_minutes}
            onChange={set("duration_minutes")}
          />
        </Field>
        <Field label="Volume (m³)" htmlFor="i-volume" error={fieldError(error, "volume_m3")}>
          <Input id="i-volume" type="number" step="0.01" min="0" value={form.volume_m3} onChange={set("volume_m3")} />
        </Field>
        <Field label={t("common.amount")} htmlFor="i-cost" error={fieldError(error, "cost")}>
          <Input id="i-cost" type="number" step="0.01" min="0" value={form.cost} onChange={set("cost")} />
        </Field>
        <Field label={t("common.notes")} htmlFor="i-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="i-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
