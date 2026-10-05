"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Budget, Farm, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { Money } from "@/components/ui/display";

const EMPTY = {
  name: "",
  category: "other",
  period_start: "",
  period_end: "",
  amount: "",
  farm_id: "",
  status: "active",
  notes: "",
};

function toForm(budget: Budget): typeof EMPTY {
  return {
    name: budget.name,
    category: budget.category,
    period_start: budget.period_start.slice(0, 10),
    period_end: budget.period_end.slice(0, 10),
    amount: String(budget.amount),
    farm_id: budget.farm_id ? String(budget.farm_id) : "",
    status: budget.status,
    notes: budget.notes ?? "",
  };
}

export function BudgetFormDialog({
  budget,
  onClose,
  onSaved,
}: {
  budget: Budget | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() => (budget ? toForm(budget) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    budget
      ? apiClient.put<{ data: Budget }>(`/budgets/${budget.id}`, payload)
      : apiClient.post<{ data: Budget }>("/budgets", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      category: form.category,
      period_start: form.period_start,
      period_end: form.period_end,
      amount: Number(form.amount),
      farm_id: form.farm_id ? Number(form.farm_id) : null,
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
      title={budget ? `Edit ${budget.name}` : "New budget"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="budget-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="budget-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="b-name" required className="sm:col-span-2" error={fieldError(error, "name")}>
          <Input id="b-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Category" htmlFor="b-category" required error={fieldError(error, "category")}>
          <Select id="b-category" required value={form.category} onChange={set("category")}>
            {Object.entries(lookups?.expense_categories ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Period start" htmlFor="b-period-start" required error={fieldError(error, "period_start")}>
          <Input id="b-period-start" type="date" required value={form.period_start} onChange={set("period_start")} />
        </Field>
        <Field
          label="Period end"
          htmlFor="b-period-end"
          required
          hint="Must be on or after the period start"
          error={fieldError(error, "period_end")}
        >
          <Input
            id="b-period-end"
            type="date"
            required
            min={form.period_start}
            value={form.period_end}
            onChange={set("period_end")}
          />
        </Field>
        <Field label={t("common.amount")} htmlFor="b-amount" required error={fieldError(error, "amount")}>
          <Input id="b-amount" type="number" step="0.01" min="0.01" required value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="Farm" htmlFor="b-farm" error={fieldError(error, "farm_id")}>
          <Select id="b-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="b-status" error={fieldError(error, "status")}>
          <Select id="b-status" value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.budget_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {budget && budget.spent !== undefined && (
          <p className="sm:col-span-2 text-sm text-muted-foreground">
            Spent so far:{" "}
            <span className="font-semibold text-foreground">
              <Money value={budget.spent} />
            </span>
          </p>
        )}
        <Field label={t("common.notes")} htmlFor="b-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="b-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
