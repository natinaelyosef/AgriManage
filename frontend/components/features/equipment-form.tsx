"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Equipment, Farm, Lookups } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const FUEL_TYPES = ["diesel", "petrol", "electric", "manual"];

const EMPTY = {
  name: "",
  code: "",
  type: "",
  serial_number: "",
  manufacturer: "",
  purchase_date: "",
  farm_id: "",
  status: "active",
  hours_meter: "",
  fuel_type: "",
  notes: "",
};

function toForm(item: Equipment): typeof EMPTY {
  return {
    name: item.name,
    code: item.code ?? "",
    type: item.type,
    serial_number: item.serial_number ?? "",
    manufacturer: item.manufacturer ?? "",
    purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : "",
    farm_id: item.farm_id ? String(item.farm_id) : "",
    status: item.status,
    hours_meter: item.hours_meter != null ? String(item.hours_meter) : "",
    fuel_type: item.fuel_type ?? "",
    notes: item.notes ?? "",
  };
}

export function EquipmentFormDialog({
  item,
  onClose,
  onSaved,
}: {
  item: Equipment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const [form, setForm] = useState(() => (item ? toForm(item) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    item
      ? apiClient.patch<{ data: Equipment }>(`/equipment/${item.id}`, payload)
      : apiClient.post<{ data: Equipment }>("/equipment", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      code: form.code || null,
      type: form.type,
      serial_number: form.serial_number || null,
      manufacturer: form.manufacturer || null,
      purchase_date: form.purchase_date || null,
      farm_id: form.farm_id ? Number(form.farm_id) : null,
      status: form.status,
      hours_meter: form.hours_meter ? Number(form.hours_meter) : null,
      fuel_type: form.fuel_type || null,
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
      title={item ? "Edit equipment" : "New equipment"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="equipment-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="equipment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="e-name" required error={fieldError(error, "name")}>
          <Input id="e-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Code" htmlFor="e-code" error={fieldError(error, "code")}>
          <Input id="e-code" value={form.code} onChange={set("code")} placeholder="EQ-001" />
        </Field>
        <Field label={t("common.type")} htmlFor="e-type" required error={fieldError(error, "type")}>
          <Select id="e-type" required value={form.type} onChange={set("type")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {Object.entries(lookups?.equipment_types ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="e-status" required error={fieldError(error, "status")}>
          <Select id="e-status" required value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.equipment_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Serial number" htmlFor="e-serial" error={fieldError(error, "serial_number")}>
          <Input id="e-serial" value={form.serial_number} onChange={set("serial_number")} />
        </Field>
        <Field label="Manufacturer" htmlFor="e-manufacturer" error={fieldError(error, "manufacturer")}>
          <Input id="e-manufacturer" value={form.manufacturer} onChange={set("manufacturer")} />
        </Field>
        <Field label="Purchase date" htmlFor="e-purchase" error={fieldError(error, "purchase_date")}>
          <Input id="e-purchase" type="date" value={form.purchase_date} onChange={set("purchase_date")} />
        </Field>
        <Field label="Farm" htmlFor="e-farm" error={fieldError(error, "farm_id")}>
          <Select id="e-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hours meter" htmlFor="e-hours" error={fieldError(error, "hours_meter")}>
          <Input id="e-hours" type="number" step="0.01" min="0" value={form.hours_meter} onChange={set("hours_meter")} />
        </Field>
        <Field label="Fuel type" htmlFor="e-fuel" error={fieldError(error, "fuel_type")}>
          <Select id="e-fuel" value={form.fuel_type} onChange={set("fuel_type")}>
            <option value="">—</option>
            {FUEL_TYPES.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="e-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="e-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
