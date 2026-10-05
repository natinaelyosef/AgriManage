"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Customer, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const CUSTOMER_TYPES = ["individual", "business", "exporter"];

const EMPTY = {
  name: "",
  type: "individual",
  phone: "",
  email: "",
  address: "",
  region: "",
  tin_number: "",
  credit_limit: "",
  status: "active",
  notes: "",
};

function toForm(customer: Customer): typeof EMPTY {
  const raw = customer as Customer & { tin_number?: string | null };
  return {
    name: customer.name,
    type: customer.type,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    region: customer.region ?? "",
    tin_number: raw.tin_number ?? "",
    credit_limit: customer.credit_limit != null ? String(customer.credit_limit) : "",
    status: customer.status,
    notes: customer.notes ?? "",
  };
}

export function CustomerFormDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [form, setForm] = useState(() => (customer ? toForm(customer) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    customer
      ? apiClient.put<{ data: Customer }>(`/customers/${customer.id}`, payload)
      : apiClient.post<{ data: Customer }>("/customers", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      type: form.type,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      region: form.region || null,
      tin_number: form.tin_number || null,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
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
      title={customer ? "Edit customer" : "New customer"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="customer-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="c-name" required error={fieldError(error, "name")}>
          <Input id="c-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label={t("common.type")} htmlFor="c-type" error={fieldError(error, "type")}>
          <Select id="c-type" value={form.type} onChange={set("type")}>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("auth.phone")} htmlFor="c-phone" error={fieldError(error, "phone")}>
          <Input id="c-phone" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label={t("auth.email")} htmlFor="c-email" error={fieldError(error, "email")}>
          <Input id="c-email" type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label={t("auth.region")} htmlFor="c-region" error={fieldError(error, "region")}>
          <Select id="c-region" value={form.region} onChange={set("region")}>
            <option value="">—</option>
            {(lookups?.regions ?? []).map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="TIN number" htmlFor="c-tin" error={fieldError(error, "tin_number")}>
          <Input id="c-tin" value={form.tin_number} onChange={set("tin_number")} />
        </Field>
        <Field label="Credit limit" htmlFor="c-credit" error={fieldError(error, "credit_limit")}>
          <Input id="c-credit" type="number" step="0.01" min="0" value={form.credit_limit} onChange={set("credit_limit")} />
        </Field>
        <Field label={t("common.status")} htmlFor="c-status">
          <Select id="c-status" value={form.status} onChange={set("status")}>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </Select>
        </Field>
        <Field label="Address" htmlFor="c-address" className="sm:col-span-2" error={fieldError(error, "address")}>
          <Input id="c-address" value={form.address} onChange={set("address")} />
        </Field>
        <Field label={t("common.notes")} htmlFor="c-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="c-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
