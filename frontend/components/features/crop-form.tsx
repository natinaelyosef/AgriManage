"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Crop, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

export interface CropRecord extends Crop {
  scientific_name: string | null;
}

const EMPTY = {
  name: "",
  category: "",
  default_unit: "",
  growing_days: "",
  scientific_name: "",
};

function toForm(crop: CropRecord): typeof EMPTY {
  return {
    name: crop.name,
    category: crop.category,
    default_unit: crop.default_unit ?? "",
    growing_days: crop.growing_days != null ? String(crop.growing_days) : "",
    scientific_name: crop.scientific_name ?? "",
  };
}

export function CropFormDialog({
  crop,
  onClose,
  onSaved,
}: {
  crop?: CropRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");

  const [form, setForm] = useState(() => (crop ? toForm(crop) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    crop
      ? apiClient.put<{ data: CropRecord }>(`/crops/${crop.id}`, payload)
      : apiClient.post<{ data: CropRecord }>("/crops", payload),
  );

  const unitEntries = Object.entries(lookups?.data.units ?? {});
  if (form.default_unit && !unitEntries.some(([key]) => key === form.default_unit)) {
    unitEntries.unshift([form.default_unit, form.default_unit]);
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      category: form.category,
      default_unit: form.default_unit || null,
      growing_days: form.growing_days ? Number(form.growing_days) : null,
      scientific_name: form.scientific_name || null,
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
      title={crop ? "Edit crop" : "New crop"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="crop-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="crop-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="c-name" required error={fieldError(error, "name")}>
          <Input id="c-name" required value={form.name} onChange={set("name")} placeholder="Teff" />
        </Field>
        <Field label={t("common.type")} htmlFor="c-category" required error={fieldError(error, "category")}>
          <Input id="c-category" required value={form.category} onChange={set("category")} placeholder="cereal" />
        </Field>
        <Field label={t("common.unit")} htmlFor="c-unit" error={fieldError(error, "default_unit")}>
          <Select id="c-unit" value={form.default_unit} onChange={set("default_unit")}>
            <option value="">—</option>
            {unitEntries.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Growing days" htmlFor="c-days" error={fieldError(error, "growing_days")}>
          <Input id="c-days" type="number" min={1} max={1000} value={form.growing_days} onChange={set("growing_days")} />
        </Field>
        <Field
          label="Scientific name"
          htmlFor="c-scientific"
          className="sm:col-span-2"
          error={fieldError(error, "scientific_name")}
        >
          <Input id="c-scientific" value={form.scientific_name} onChange={set("scientific_name")} placeholder="Eragrostis tef" />
        </Field>
      </form>
    </Modal>
  );
}
