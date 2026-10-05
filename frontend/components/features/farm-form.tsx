"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const FARM_TYPES = ["smallholder", "commercial", "estate", "cooperative", "experimental", "pastoral"];

const EMPTY = {
  name: "",
  code: "",
  type: "smallholder",
  region: "",
  zone: "",
  woreda: "",
  kebele: "",
  area_hectares: "",
  cultivated_hectares: "",
  latitude: "",
  longitude: "",
  established_year: "",
  status: "active",
  description: "",
};

function toForm(farm: Farm): typeof EMPTY {
  return {
    name: farm.name,
    code: farm.code ?? "",
    type: farm.type,
    region: farm.region ?? "",
    zone: farm.zone ?? "",
    woreda: farm.woreda ?? "",
    kebele: farm.kebele ?? "",
    area_hectares: String(farm.area_hectares ?? ""),
    cultivated_hectares: String(farm.cultivated_hectares ?? ""),
    latitude: farm.latitude != null ? String(farm.latitude) : "",
    longitude: farm.longitude != null ? String(farm.longitude) : "",
    established_year: farm.established_year != null ? String(farm.established_year) : "",
    status: farm.status,
    description: farm.description ?? "",
  };
}

/** Mount only while open (parent conditionally renders) so state resets per open. */
export function FarmFormDialog({
  farm,
  onClose,
  onSaved,
}: {
  farm?: Farm | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookups } = useResource<{ data: { regions: string[] } }>("/meta/lookups");

  const [form, setForm] = useState(() => (farm ? toForm(farm) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    farm
      ? apiClient.put<{ data: Farm }>(`/farms/${farm.id}`, payload)
      : apiClient.post<{ data: Farm }>("/farms", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      code: form.code || null,
      type: form.type,
      region: form.region || null,
      zone: form.zone || null,
      woreda: form.woreda || null,
      kebele: form.kebele || null,
      area_hectares: Number(form.area_hectares) || 0,
      cultivated_hectares: form.cultivated_hectares ? Number(form.cultivated_hectares) : null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      established_year: form.established_year ? Number(form.established_year) : null,
      status: form.status,
      description: form.description || null,
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
      title={farm ? "Edit farm" : "New farm"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="farm-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="farm-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="f-name" required className="sm:col-span-2" error={fieldError(error, "name")}>
          <Input id="f-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Code" htmlFor="f-code" error={fieldError(error, "code")}>
          <Input id="f-code" value={form.code} onChange={set("code")} placeholder="FRM-001" />
        </Field>
        <Field label={t("common.type")} htmlFor="f-type" error={fieldError(error, "type")}>
          <Select id="f-type" value={form.type} onChange={set("type")}>
            {FARM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("auth.region")} htmlFor="f-region" error={fieldError(error, "region")}>
          <Select id="f-region" value={form.region} onChange={set("region")}>
            <option value="">—</option>
            {(lookups?.data.regions ?? []).map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Zone" htmlFor="f-zone" error={fieldError(error, "zone")}>
          <Input id="f-zone" value={form.zone} onChange={set("zone")} />
        </Field>
        <Field label="Woreda" htmlFor="f-woreda" error={fieldError(error, "woreda")}>
          <Input id="f-woreda" value={form.woreda} onChange={set("woreda")} />
        </Field>
        <Field label="Kebele" htmlFor="f-kebele" error={fieldError(error, "kebele")}>
          <Input id="f-kebele" value={form.kebele} onChange={set("kebele")} />
        </Field>
        <Field label={`${t("common.area")} (ha)`} htmlFor="f-area" required error={fieldError(error, "area_hectares")}>
          <Input
            id="f-area"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.area_hectares}
            onChange={set("area_hectares")}
          />
        </Field>
        <Field
          label={`${t("dashboard.kpi.cultivated")} (ha)`}
          htmlFor="f-cultivated"
          error={fieldError(error, "cultivated_hectares")}
        >
          <Input
            id="f-cultivated"
            type="number"
            step="0.01"
            min="0"
            value={form.cultivated_hectares}
            onChange={set("cultivated_hectares")}
          />
        </Field>
        <Field label="Latitude" htmlFor="f-lat" error={fieldError(error, "latitude")}>
          <Input id="f-lat" type="number" step="any" value={form.latitude} onChange={set("latitude")} placeholder="9.03" />
        </Field>
        <Field label="Longitude" htmlFor="f-lng" error={fieldError(error, "longitude")}>
          <Input id="f-lng" type="number" step="any" value={form.longitude} onChange={set("longitude")} placeholder="38.74" />
        </Field>
        <Field label="Established" htmlFor="f-year" error={fieldError(error, "established_year")}>
          <Input id="f-year" type="number" min="1900" max="2100" value={form.established_year} onChange={set("established_year")} />
        </Field>
        <Field label={t("common.status")} htmlFor="f-status">
          <Select id="f-status" value={form.status} onChange={set("status")}>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </Select>
        </Field>
        <Field label={t("common.description")} htmlFor="f-desc" className="sm:col-span-2" error={fieldError(error, "description")}>
          <Textarea id="f-desc" value={form.description} onChange={set("description")} />
        </Field>
      </form>
    </Modal>
  );
}
