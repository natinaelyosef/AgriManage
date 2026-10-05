"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, LandRecord, Lookups } from "@/lib/api/types";
import { titleCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const LAND_STATUSES = ["active", "pending", "expired"];

const EMPTY = {
  parcel_name: "",
  holder_name: "",
  farm_id: "",
  tenure_type: "owner",
  document_number: "",
  area_hectares: "",
  issue_date: "",
  expiry_date: "",
  region: "",
  zone: "",
  woreda: "",
  kebele: "",
  status: "active",
  notes: "",
};

function toForm(record: LandRecord): typeof EMPTY {
  return {
    parcel_name: record.parcel_name,
    holder_name: record.holder_name,
    farm_id: record.farm_id ? String(record.farm_id) : "",
    tenure_type: record.tenure_type,
    document_number: record.document_number ?? "",
    area_hectares: String(record.area_hectares),
    issue_date: record.issue_date ? record.issue_date.slice(0, 10) : "",
    expiry_date: record.expiry_date ? record.expiry_date.slice(0, 10) : "",
    region: record.region ?? "",
    zone: record.zone ?? "",
    woreda: record.woreda ?? "",
    kebele: record.kebele ?? "",
    status: record.status,
    notes: record.notes ?? "",
  };
}

export function LandRecordFormDialog({
  record,
  onClose,
  onSaved,
}: {
  record: LandRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() => (record ? toForm(record) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    record
      ? apiClient.put<{ data: LandRecord }>(`/land-records/${record.id}`, payload)
      : apiClient.post<{ data: LandRecord }>("/land-records", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      parcel_name: form.parcel_name,
      holder_name: form.holder_name,
      farm_id: form.farm_id ? Number(form.farm_id) : null,
      tenure_type: form.tenure_type,
      document_number: form.document_number || null,
      area_hectares: Number(form.area_hectares),
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      region: form.region || null,
      zone: form.zone || null,
      woreda: form.woreda || null,
      kebele: form.kebele || null,
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
      title={record ? `Edit ${record.parcel_name}` : "New land record"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="land-record-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="land-record-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Parcel name"
          htmlFor="lr-parcel"
          required
          className="sm:col-span-2"
          error={fieldError(error, "parcel_name")}
        >
          <Input id="lr-parcel" required value={form.parcel_name} onChange={set("parcel_name")} />
        </Field>
        <Field label="Holder name" htmlFor="lr-holder" required error={fieldError(error, "holder_name")}>
          <Input id="lr-holder" required value={form.holder_name} onChange={set("holder_name")} />
        </Field>
        <Field label="Farm" htmlFor="lr-farm" error={fieldError(error, "farm_id")}>
          <Select id="lr-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tenure type" htmlFor="lr-tenure" required error={fieldError(error, "tenure_type")}>
          <Select id="lr-tenure" required value={form.tenure_type} onChange={set("tenure_type")}>
            {Object.entries(lookups?.tenure_types ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.area")} htmlFor="lr-area" required error={fieldError(error, "area_hectares")}>
          <Input
            id="lr-area"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.area_hectares}
            onChange={set("area_hectares")}
          />
        </Field>
        <Field label="Document number" htmlFor="lr-document" error={fieldError(error, "document_number")}>
          <Input id="lr-document" value={form.document_number} onChange={set("document_number")} />
        </Field>
        <Field label="Issue date" htmlFor="lr-issue" error={fieldError(error, "issue_date")}>
          <Input id="lr-issue" type="date" value={form.issue_date} onChange={set("issue_date")} />
        </Field>
        <Field
          label="Expiry date"
          htmlFor="lr-expiry"
          hint="Must be on or after the issue date"
          error={fieldError(error, "expiry_date")}
        >
          <Input
            id="lr-expiry"
            type="date"
            min={form.issue_date}
            value={form.expiry_date}
            onChange={set("expiry_date")}
          />
        </Field>
        <Field label="Region" htmlFor="lr-region" error={fieldError(error, "region")}>
          <Input id="lr-region" value={form.region} onChange={set("region")} />
        </Field>
        <Field label="Zone" htmlFor="lr-zone" error={fieldError(error, "zone")}>
          <Input id="lr-zone" value={form.zone} onChange={set("zone")} />
        </Field>
        <Field label="Woreda" htmlFor="lr-woreda" error={fieldError(error, "woreda")}>
          <Input id="lr-woreda" value={form.woreda} onChange={set("woreda")} />
        </Field>
        <Field label="Kebele" htmlFor="lr-kebele" error={fieldError(error, "kebele")}>
          <Input id="lr-kebele" value={form.kebele} onChange={set("kebele")} />
        </Field>
        <Field label={t("common.status")} htmlFor="lr-status" error={fieldError(error, "status")}>
          <Select id="lr-status" value={form.status} onChange={set("status")}>
            {LAND_STATUSES.map((status) => (
              <option key={status} value={status}>
                {titleCase(status)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="lr-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="lr-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
