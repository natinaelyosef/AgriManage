"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Equipment, Lookups, MaintenanceRecord, Worker } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const EMPTY = {
  equipment_id: "",
  title: "",
  type: "",
  status: "scheduled",
  performed_date: "",
  next_due_date: "",
  cost: "",
  performed_by: "",
  notes: "",
};

function toForm(record: MaintenanceRecord): typeof EMPTY {
  return {
    equipment_id: String(record.equipment_id),
    title: record.title,
    type: record.type,
    status: record.status,
    performed_date: record.performed_date ? record.performed_date.slice(0, 10) : "",
    next_due_date: record.next_due_date ? record.next_due_date.slice(0, 10) : "",
    cost: record.cost != null ? String(record.cost) : "",
    performed_by: record.performed_by ? String(record.performed_by) : "",
    notes: record.notes ?? "",
  };
}

export function MaintenanceRecordFormDialog({
  record,
  onClose,
  onSaved,
}: {
  record: MaintenanceRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { items: equipment } = usePaginated<Equipment>("/equipment", { per_page: 100 });
  const { items: workers } = usePaginated<Worker>("/workers", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [form, setForm] = useState(() => (record ? toForm(record) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    record
      ? apiClient.patch<{ data: MaintenanceRecord }>(`/maintenance-records/${record.id}`, payload)
      : apiClient.post<{ data: MaintenanceRecord }>("/maintenance-records", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      equipment_id: Number(form.equipment_id),
      title: form.title,
      type: form.type,
      status: form.status,
      performed_date: form.performed_date || null,
      next_due_date: form.next_due_date || null,
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

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? "Edit maintenance record" : "New maintenance record"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="maintenance-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="maintenance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Equipment" htmlFor="m-equipment" required error={fieldError(error, "equipment_id")}>
          <Select id="m-equipment" required value={form.equipment_id} onChange={set("equipment_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor="m-title" required error={fieldError(error, "title")}>
          <Input id="m-title" required value={form.title} onChange={set("title")} placeholder="Oil change" />
        </Field>
        <Field label={t("common.type")} htmlFor="m-type" required error={fieldError(error, "type")}>
          <Select id="m-type" required value={form.type} onChange={set("type")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {Object.entries(lookups?.maintenance_types ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="m-status" required error={fieldError(error, "status")}>
          <Select id="m-status" required value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.maintenance_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Performed date" htmlFor="m-performed" error={fieldError(error, "performed_date")}>
          <Input id="m-performed" type="date" value={form.performed_date} onChange={set("performed_date")} />
        </Field>
        <Field label="Next due date" htmlFor="m-next-due" error={fieldError(error, "next_due_date")}>
          <Input id="m-next-due" type="date" value={form.next_due_date} onChange={set("next_due_date")} />
        </Field>
        <Field label="Cost" htmlFor="m-cost" error={fieldError(error, "cost")}>
          <Input id="m-cost" type="number" step="0.01" min="0" value={form.cost} onChange={set("cost")} />
        </Field>
        <Field label="Performed by" htmlFor="m-performed-by" error={fieldError(error, "performed_by")}>
          <Select id="m-performed-by" value={form.performed_by} onChange={set("performed_by")}>
            <option value="">—</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="m-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="m-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
