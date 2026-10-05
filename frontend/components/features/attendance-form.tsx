"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { AttendanceRecord, Lookups, Worker } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  worker_id: "",
  work_date: "",
  status: "present",
  hours: "",
  notes: "",
};

function toForm(record: AttendanceRecord): typeof EMPTY {
  return {
    worker_id: String(record.worker_id),
    work_date: record.work_date.slice(0, 10),
    status: record.status,
    hours: record.hours !== null ? String(record.hours) : "",
    notes: record.notes ?? "",
  };
}

export function AttendanceFormDialog({
  record,
  onClose,
  onSaved,
}: {
  record: AttendanceRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { items: workers } = usePaginated<Worker>("/workers", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [form, setForm] = useState(() => (record ? toForm(record) : { ...EMPTY, work_date: today() }));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    record
      ? apiClient.put<{ data: AttendanceRecord }>(`/attendance-records/${record.id}`, payload)
      : apiClient.post<{ data: AttendanceRecord }>("/attendance-records", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      worker_id: form.worker_id ? Number(form.worker_id) : null,
      work_date: form.work_date,
      status: form.status,
      hours: form.hours !== "" ? Number(form.hours) : null,
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
      title={record ? "Edit attendance" : "New attendance record"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="attendance-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="attendance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Worker" htmlFor="a-worker" required error={fieldError(error, "worker_id")}>
          <Select id="a-worker" required value={form.worker_id} onChange={set("worker_id")}>
            <option value="">—</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.date")} htmlFor="a-date" required error={fieldError(error, "work_date")}>
          <Input id="a-date" type="date" required value={form.work_date} onChange={set("work_date")} />
        </Field>
        <Field label={t("common.status")} htmlFor="a-status" error={fieldError(error, "status")}>
          <Select id="a-status" value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.attendance_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hours" htmlFor="a-hours" error={fieldError(error, "hours")}>
          <Input id="a-hours" type="number" step="0.5" min="0" max="24" value={form.hours} onChange={set("hours")} />
        </Field>
        <Field label={t("common.notes")} htmlFor="a-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="a-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
