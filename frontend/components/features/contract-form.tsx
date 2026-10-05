"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Contract, Farm, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const CURRENCIES = ["ETB", "USD", "EUR"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  title: "",
  type: "produce_sale",
  counterparty: "",
  counterparty_phone: "",
  start_date: "",
  end_date: "",
  value: "",
  currency: "ETB",
  payment_terms: "",
  status: "draft",
  document_number: "",
  farm_id: "",
  notes: "",
};

function toForm(contract: Contract): typeof EMPTY {
  return {
    title: contract.title,
    type: contract.type,
    counterparty: contract.counterparty,
    counterparty_phone: contract.counterparty_phone ?? "",
    start_date: contract.start_date.slice(0, 10),
    end_date: contract.end_date ? contract.end_date.slice(0, 10) : "",
    value: String(contract.value),
    currency: contract.currency,
    payment_terms: contract.payment_terms ?? "",
    status: contract.status,
    document_number: contract.document_number ?? "",
    farm_id: contract.farm_id ? String(contract.farm_id) : "",
    notes: contract.notes ?? "",
  };
}

export function ContractFormDialog({
  contract,
  onClose,
  onSaved,
}: {
  contract: Contract | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() =>
    contract ? toForm(contract) : { ...EMPTY, start_date: today() },
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    contract
      ? apiClient.put<{ data: Contract }>(`/contracts/${contract.id}`, payload)
      : apiClient.post<{ data: Contract }>("/contracts", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      title: form.title,
      type: form.type,
      counterparty: form.counterparty,
      counterparty_phone: form.counterparty_phone || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      value: Number(form.value),
      currency: form.currency,
      payment_terms: form.payment_terms || null,
      status: form.status,
      document_number: form.document_number || null,
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
      title={contract ? `Edit ${contract.title}` : "New contract"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="contract-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="contract-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="c-title" required className="sm:col-span-2" error={fieldError(error, "title")}>
          <Input id="c-title" required value={form.title} onChange={set("title")} />
        </Field>
        <Field label="Contract type" htmlFor="c-type" required error={fieldError(error, "type")}>
          <Select id="c-type" required value={form.type} onChange={set("type")}>
            {Object.entries(lookups?.contract_types ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Counterparty" htmlFor="c-counterparty" required error={fieldError(error, "counterparty")}>
          <Input id="c-counterparty" required value={form.counterparty} onChange={set("counterparty")} />
        </Field>
        <Field label={t("auth.phone")} htmlFor="c-phone" error={fieldError(error, "counterparty_phone")}>
          <Input id="c-phone" value={form.counterparty_phone} onChange={set("counterparty_phone")} />
        </Field>
        <Field label="Start date" htmlFor="c-start" required error={fieldError(error, "start_date")}>
          <Input id="c-start" type="date" required value={form.start_date} onChange={set("start_date")} />
        </Field>
        <Field
          label="End date"
          htmlFor="c-end"
          hint="Must be on or after the start date"
          error={fieldError(error, "end_date")}
        >
          <Input
            id="c-end"
            type="date"
            min={form.start_date}
            value={form.end_date}
            onChange={set("end_date")}
          />
        </Field>
        <Field label={t("common.amount")} htmlFor="c-value" required error={fieldError(error, "value")}>
          <Input
            id="c-value"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.value}
            onChange={set("value")}
          />
        </Field>
        <Field label="Currency" htmlFor="c-currency" error={fieldError(error, "currency")}>
          <Select id="c-currency" value={form.currency} onChange={set("currency")}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment terms" htmlFor="c-terms" error={fieldError(error, "payment_terms")}>
          <Input id="c-terms" value={form.payment_terms} onChange={set("payment_terms")} placeholder="Net 30" />
        </Field>
        <Field label={t("common.status")} htmlFor="c-status" required error={fieldError(error, "status")}>
          <Select id="c-status" required value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.contract_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Document number" htmlFor="c-document" error={fieldError(error, "document_number")}>
          <Input id="c-document" value={form.document_number} onChange={set("document_number")} />
        </Field>
        <Field label="Farm" htmlFor="c-farm" error={fieldError(error, "farm_id")}>
          <Select id="c-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="c-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="c-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
