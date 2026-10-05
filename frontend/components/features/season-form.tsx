"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Season } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

const STATUSES = ["planned", "active", "completed", "archived"];

const EMPTY = {
  name: "",
  code: "",
  year: "",
  start_date: "",
  end_date: "",
  status: "planned",
  notes: "",
};

function toForm(season: Season): typeof EMPTY {
  return {
    name: season.name,
    code: season.code ?? "",
    year: String(season.year ?? ""),
    start_date: (season.start_date ?? "").slice(0, 10),
    end_date: (season.end_date ?? "").slice(0, 10),
    status: season.status,
    notes: season.notes ?? "",
  };
}

export function SeasonFormDialog({
  season,
  onClose,
  onSaved,
}: {
  season?: Season | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();

  const [form, setForm] = useState(() =>
    season ? toForm(season) : { ...EMPTY, year: String(new Date().getFullYear()) },
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    season
      ? apiClient.put<{ data: Season }>(`/seasons/${season.id}`, payload)
      : apiClient.post<{ data: Season }>("/seasons", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      code: form.code || null,
      year: Number(form.year),
      start_date: form.start_date,
      end_date: form.end_date,
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
      title={season ? "Edit season" : "New season"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="season-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="season-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="se-name" required className="sm:col-span-2" error={fieldError(error, "name")}>
          <Input id="se-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Code" htmlFor="se-code" error={fieldError(error, "code")}>
          <Input id="se-code" value={form.code} onChange={set("code")} placeholder="SEA-2026" />
        </Field>
        <Field label="Year" htmlFor="se-year" required error={fieldError(error, "year")}>
          <Input
            id="se-year"
            type="number"
            min="2000"
            max="2100"
            required
            value={form.year}
            onChange={set("year")}
          />
        </Field>
        <Field label="Start date" htmlFor="se-start" required error={fieldError(error, "start_date")}>
          <Input id="se-start" type="date" required value={form.start_date} onChange={set("start_date")} />
        </Field>
        <Field label="End date" htmlFor="se-end" required error={fieldError(error, "end_date")}>
          <Input id="se-end" type="date" required value={form.end_date} onChange={set("end_date")} />
        </Field>
        <Field label={t("common.status")} htmlFor="se-status" error={fieldError(error, "status")}>
          <Select id="se-status" value={form.status} onChange={set("status")}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="se-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="se-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}
