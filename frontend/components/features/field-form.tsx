"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Field, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field as FormField, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const EMPTY = {
  farm_id: "",
  name: "",
  code: "",
  area_hectares: "",
  soil_type: "",
  irrigation_type: "",
  topography: "",
  latitude: "",
  longitude: "",
  altitude_m: "",
  status: "active",
  notes: "",
};

function toForm(field: Field): typeof EMPTY {
  return {
    farm_id: String(field.farm_id ?? ""),
    name: field.name,
    code: field.code ?? "",
    area_hectares: String(field.area_hectares ?? ""),
    soil_type: field.soil_type ?? "",
    irrigation_type: field.irrigation_type ?? "",
    topography: field.topography ?? "",
    latitude: field.latitude != null ? String(field.latitude) : "",
    longitude: field.longitude != null ? String(field.longitude) : "",
    altitude_m: field.altitude_m != null ? String(field.altitude_m) : "",
    status: field.status,
    notes: field.notes ?? "",
  };
}

export function FieldFormDialog({
  field,
  onClose,
  onSaved,
}: {
  field?: Field | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() => (field ? toForm(field) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    field
      ? apiClient.put<{ data: Field }>(`/fields/${field.id}`, payload)
      : apiClient.post<{ data: Field }>("/fields", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      farm_id: Number(form.farm_id),
      name: form.name,
      code: form.code || null,
      area_hectares: Number(form.area_hectares) || 0,
      soil_type: form.soil_type || null,
      irrigation_type: form.irrigation_type || null,
      topography: form.topography || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      altitude_m: form.altitude_m ? Number(form.altitude_m) : null,
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

  const currentFarmMissing = form.farm_id !== "" && !farms.some((farm) => String(farm.id) === form.farm_id);

  return (
    <Modal
      open
      onClose={onClose}
      title={field ? "Edit field" : "New field"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="field-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="field-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Farm" htmlFor="fl-farm" required className="sm:col-span-2" error={fieldError(error, "farm_id")}>
          <Select id="fl-farm" required value={form.farm_id} onChange={set("farm_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {currentFarmMissing && (
              <option value={form.farm_id}>
                {field?.farm?.name ?? `Farm #${form.farm_id}`}
              </option>
            )}
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label={t("common.name")}
          htmlFor="fl-name"
          required
          error={fieldError(error, "name")}
        >
          <Input id="fl-name" required value={form.name} onChange={set("name")} />
        </FormField>
        <FormField label="Code" htmlFor="fl-code" error={fieldError(error, "code")}>
          <Input id="fl-code" value={form.code} onChange={set("code")} placeholder="FLD-001" />
        </FormField>
        <FormField
          label={`${t("common.area")} (ha)`}
          htmlFor="fl-area"
          required
          error={fieldError(error, "area_hectares")}
        >
          <Input
            id="fl-area"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.area_hectares}
            onChange={set("area_hectares")}
          />
        </FormField>
        <FormField label="Soil type" htmlFor="fl-soil" error={fieldError(error, "soil_type")}>
          <Select id="fl-soil" value={form.soil_type} onChange={set("soil_type")}>
            <option value="">—</option>
            {(lookups?.data.soil_types ?? []).map((soil) => (
              <option key={soil} value={soil}>
                {soil}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Irrigation" htmlFor="fl-irrigation" error={fieldError(error, "irrigation_type")}>
          <Select id="fl-irrigation" value={form.irrigation_type} onChange={set("irrigation_type")}>
            <option value="">—</option>
            {(lookups?.data.irrigation_types ?? []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Topography" htmlFor="fl-topography" error={fieldError(error, "topography")}>
          <Input id="fl-topography" value={form.topography} onChange={set("topography")} placeholder="Flat / Sloped" />
        </FormField>
        <FormField label="Latitude" htmlFor="fl-lat" error={fieldError(error, "latitude")}>
          <Input id="fl-lat" type="number" step="any" value={form.latitude} onChange={set("latitude")} placeholder="9.03" />
        </FormField>
        <FormField label="Longitude" htmlFor="fl-lng" error={fieldError(error, "longitude")}>
          <Input id="fl-lng" type="number" step="any" value={form.longitude} onChange={set("longitude")} placeholder="38.74" />
        </FormField>
        <FormField label="Altitude (m)" htmlFor="fl-altitude" error={fieldError(error, "altitude_m")}>
          <Input id="fl-altitude" type="number" step="any" value={form.altitude_m} onChange={set("altitude_m")} />
        </FormField>
        <FormField label={t("common.status")} htmlFor="fl-status" error={fieldError(error, "status")}>
          <Select id="fl-status" value={form.status} onChange={set("status")}>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
          </Select>
        </FormField>
        <FormField
          label={t("common.notes")}
          htmlFor="fl-notes"
          className="sm:col-span-2"
          error={fieldError(error, "notes")}
        >
          <Textarea id="fl-notes" value={form.notes} onChange={set("notes")} />
        </FormField>
      </form>
    </Modal>
  );
}
