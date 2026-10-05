"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { OrgUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";

export interface RoleOption {
  id: number;
  name: string;
  slug: string;
}

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  position: "",
  role_id: "",
  status: "active",
  password: "",
};

function toForm(user: OrgUser): typeof EMPTY {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    position: user.position ?? "",
    role_id: user.role ? String(user.role.id) : "",
    status: user.status,
    password: "",
  };
}

export function UserFormDialog({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user?: OrgUser | null;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => (user ? toForm(user) : EMPTY));
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    user
      ? apiClient.put<{ data: OrgUser }>(`/users/${user.id}`, payload)
      : apiClient.post<{ data: OrgUser }>("/users", payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      position: form.position || null,
      role_id: Number(form.role_id),
      status: form.status,
    };

    if (form.password) payload.password = form.password;

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
      title={user ? "Edit member" : "Invite member"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="user-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("auth.name")}
          htmlFor="u-name"
          required
          className="sm:col-span-2"
          error={fieldError(error, "name")}
        >
          <Input id="u-name" required value={form.name} onChange={set("name")} />
        </Field>
        <Field label={t("auth.email")} htmlFor="u-email" required error={fieldError(error, "email")}>
          <Input id="u-email" type="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label={t("auth.phone")} htmlFor="u-phone" error={fieldError(error, "phone")}>
          <Input id="u-phone" type="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Position" htmlFor="u-position" error={fieldError(error, "position")}>
          <Input id="u-position" value={form.position} onChange={set("position")} placeholder="Field officer" />
        </Field>
        <Field label="Role" htmlFor="u-role" required error={fieldError(error, "role_id")}>
          <Select id="u-role" required value={form.role_id} onChange={set("role_id")}>
            <option value="">{t("form.selectPlaceholder")}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="u-status" error={fieldError(error, "status")}>
          <Select id="u-status" value={form.status} onChange={set("status")}>
            <option value="active">{t("status.active")}</option>
            <option value="suspended">{t("status.suspended")}</option>
          </Select>
        </Field>
        <Field
          label={user ? "New password" : t("auth.password")}
          htmlFor="u-password"
          required={!user}
          className="sm:col-span-2"
          error={fieldError(error, "password")}
        >
          <Input
            id="u-password"
            type="password"
            required={!user}
            minLength={user ? undefined : 8}
            value={form.password}
            onChange={set("password")}
            placeholder={user ? "Leave blank to keep the current password" : "Minimum 8 characters"}
          />
        </Field>
      </form>
    </Modal>
  );
}
