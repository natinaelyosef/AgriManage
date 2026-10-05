"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, ApiError } from "@/lib/api/client";
import type { Lookups, PayrollRun } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { Money } from "@/components/ui/display";

const EMPTY = {
  period_start: "",
  period_end: "",
  status: "draft",
  notes: "",
};

function toForm(run: PayrollRun): typeof EMPTY {
  return {
    period_start: run.period_start.slice(0, 10),
    period_end: run.period_end.slice(0, 10),
    status: run.status,
    notes: run.notes ?? "",
  };
}

export function PayrollRunFormDialog({
  run,
  onClose,
  onSaved,
}: {
  run: PayrollRun | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [form, setForm] = useState(() => (run ? toForm(run) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    run
      ? apiClient.put<{ data: PayrollRun }>(`/payroll-runs/${run.id}`, payload)
      : apiClient.post<{ data: PayrollRun }>("/payroll-runs", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!run && form.period_end < form.period_start) {
      const message = "The period end date must be on or after the period start date.";
      setError(new ApiError(message, 422, { period_end: [message] }));
      return;
    }
    const payload = run
      ? {
          status: form.status,
          notes: form.notes || null,
        }
      : {
          period_start: form.period_start,
          period_end: form.period_end,
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
      title={run ? "Edit payroll run" : "New payroll run"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="payroll-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="payroll-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {run ? (
          <div className="space-y-1 rounded-lg bg-muted/60 p-3 sm:col-span-2">
            <p className="text-sm font-semibold text-foreground">
              {run.period_start} → {run.period_end}
            </p>
            <p className="text-xs text-muted-foreground">
              {run.items?.length ?? 0} workers · <Money value={run.total} />
            </p>
          </div>
        ) : (
          <>
            <Field
              label="Period start"
              htmlFor="p-start"
              required
              error={fieldError(error, "period_start")}
              hint="Wages are generated from attendance recorded in this period."
            >
              <Input
                id="p-start"
                type="date"
                required
                value={form.period_start}
                onChange={set("period_start")}
              />
            </Field>
            <Field label="Period end" htmlFor="p-end" required error={fieldError(error, "period_end")}>
              <Input
                id="p-end"
                type="date"
                required
                min={form.period_start}
                value={form.period_end}
                onChange={set("period_end")}
              />
            </Field>
          </>
        )}
        <Field label={t("common.status")} htmlFor="p-status" error={fieldError(error, "status")}>
          <Select id="p-status" value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.payroll_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="p-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="p-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
