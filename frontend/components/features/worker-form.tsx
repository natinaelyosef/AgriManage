"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Worker } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const EMPLOYMENT_TYPES = ["permanent", "seasonal", "daily", "contract"];

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  role: "",
  employment_type: "daily",
  daily_rate: "",
  hire_date: "",
  status: "active",
  gender: "",
  farm_id: "",
  notes: "",
};

function toForm(worker: Worker): typeof EMPTY {
  return {
    name: worker.name,
    phone: worker.phone ?? "",
    email: worker.email ?? "",
    role: worker.role ?? "",
    employment_type: worker.employment_type,
    daily_rate: worker.daily_rate ? String(worker.daily_rate) : "",
    hire_date: worker.hire_date ? worker.hire_date.slice(0, 10) : "",
    status: worker.status,
    gender: worker.gender ?? "",
    farm_id: worker.farm_id ? String(worker.farm_id) : "",
    notes: worker.notes ?? "",
  };
}

export function WorkerFormDialog({
  worker,
  onClose,
  onSaved,
}: {
  worker?: Worker | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() => (worker ? toForm(worker) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    worker
      ? apiClient.put<{ data: Worker }>(`/workers/${worker.id}`, payload)
      : apiClient.post<{ data: Worker }>("/workers", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      role: form.role || null,
      employment_type: form.employment_type,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      hire_date: form.hire_date || null,
      status: form.status,
      gender: form.gender || null,
      farm_id: form.farm_id ? Number(form.farm_id) : null,
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
      title={worker ? "Edit worker" : "New worker"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="worker-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="worker-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="w-name" required error={fieldError(error, "name")}>
          <Input id="w-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Role" htmlFor="w-role" error={fieldError(error, "role")}>
          <Input id="w-role" value={form.role} onChange={set("role")} placeholder="Supervisor" />
        </Field>
        <Field label={t("auth.phone")} htmlFor="w-phone" error={fieldError(error, "phone")}>
          <Input id="w-phone" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label={t("auth.email")} htmlFor="w-email" error={fieldError(error, "email")}>
          <Input id="w-email" type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Employment type" htmlFor="w-employment" error={fieldError(error, "employment_type")}>
          <Select id="w-employment" value={form.employment_type} onChange={set("employment_type")}>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Daily rate" htmlFor="w-rate" error={fieldError(error, "daily_rate")}>
          <Input id="w-rate" type="number" step="0.01" min="0" value={form.daily_rate} onChange={set("daily_rate")} />
        </Field>
        <Field label="Hire date" htmlFor="w-hire" error={fieldError(error, "hire_date")}>
          <Input id="w-hire" type="date" value={form.hire_date} onChange={set("hire_date")} />
        </Field>
        <Field label={t("common.status")} htmlFor="w-status">
          <Select id="w-status" value={form.status} onChange={set("status")}>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </Select>
        </Field>
        <Field label="Gender" htmlFor="w-gender" error={fieldError(error, "gender")}>
          <Select id="w-gender" value={form.gender} onChange={set("gender")}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Farm" htmlFor="w-farm" error={fieldError(error, "farm_id")}>
          <Select id="w-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="w-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="w-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
