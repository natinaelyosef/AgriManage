"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { useMutation, usePaginated, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Farm, Lookups, PurchaseOrder, PurchaseOrderItem } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { Money } from "@/components/ui/display";

interface Line {
  uid: number;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

let lineCounter = 0;

function nextUid(): number {
  lineCounter += 1;
  return lineCounter;
}

function emptyLine(): Line {
  return { uid: nextUid(), description: "", quantity: "", unit: "unit", unit_price: "" };
}

function toLine(item: PurchaseOrderItem): Line {
  return {
    uid: nextUid(),
    description: item.description,
    quantity: String(item.quantity),
    unit: item.unit ?? "",
    unit_price: String(item.unit_price),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  supplier: "",
  order_date: "",
  expected_date: "",
  farm_id: "",
  status: "draft",
  notes: "",
};

function toForm(order: PurchaseOrder): typeof EMPTY {
  return {
    supplier: order.supplier,
    order_date: order.order_date.slice(0, 10),
    expected_date: order.expected_date ? order.expected_date.slice(0, 10) : "",
    farm_id: order.farm_id ? String(order.farm_id) : "",
    status: order.status,
    notes: order.notes ?? "",
  };
}

export function PurchaseOrderFormDialog({
  order,
  onClose,
  onSaved,
}: {
  order: PurchaseOrder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;
  const { items: farms } = usePaginated<Farm>("/farms", { per_page: 100 });

  const [form, setForm] = useState(() => (order ? toForm(order) : { ...EMPTY, order_date: today() }));
  const [lines, setLines] = useState<Line[]>(() =>
    order?.items && order.items.length > 0 ? order.items.map(toLine) : [emptyLine()],
  );
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const setLine = (uid: number, key: keyof Line) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setLines((prev) => prev.map((line) => (line.uid === uid ? { ...line, [key]: event.target.value } : line)));

  const save = useMutation(async (payload: Record<string, unknown>) =>
    order
      ? apiClient.put<{ data: PurchaseOrder }>(`/purchase-orders/${order.id}`, payload)
      : apiClient.post<{ data: PurchaseOrder }>("/purchase-orders", payload),
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      supplier: form.supplier,
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      farm_id: form.farm_id ? Number(form.farm_id) : null,
      status: form.status,
      notes: form.notes || null,
      items: lines.map((line) => ({
        description: line.description,
        quantity: Number(line.quantity),
        unit: line.unit || null,
        unit_price: Number(line.unit_price),
      })),
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
      title={order ? `Edit ${order.po_number}` : "New purchase order"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="purchase-order-form" type="submit" loading={save.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="purchase-order-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier" htmlFor="po-supplier" required className="sm:col-span-2" error={fieldError(error, "supplier")}>
          <Input id="po-supplier" required value={form.supplier} onChange={set("supplier")} />
        </Field>
        <Field label="Order date" htmlFor="po-order-date" required error={fieldError(error, "order_date")}>
          <Input id="po-order-date" type="date" required value={form.order_date} onChange={set("order_date")} />
        </Field>
        <Field
          label="Expected date"
          htmlFor="po-expected-date"
          hint="Must be on or after the order date"
          error={fieldError(error, "expected_date")}
        >
          <Input
            id="po-expected-date"
            type="date"
            min={form.order_date}
            value={form.expected_date}
            onChange={set("expected_date")}
          />
        </Field>
        <Field label="Farm" htmlFor="po-farm" error={fieldError(error, "farm_id")}>
          <Select id="po-farm" value={form.farm_id} onChange={set("farm_id")}>
            <option value="">—</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.status")} htmlFor="po-status" error={fieldError(error, "status")}>
          <Select id="po-status" value={form.status} onChange={set("status")}>
            {Object.entries(lookups?.purchase_order_statuses ?? {}).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("common.notes")} htmlFor="po-notes" className="sm:col-span-2" error={fieldError(error, "notes")}>
          <Textarea id="po-notes" value={form.notes} onChange={set("notes")} />
        </Field>

        <div className="sm:col-span-2">
          <p className="label">Line items</p>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.uid} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Description"
                    htmlFor={`po-line-desc-${line.uid}`}
                    required
                    className="sm:col-span-2"
                    error={fieldError(error, `items.${index}.description`)}
                  >
                    <Input
                      id={`po-line-desc-${line.uid}`}
                      required
                      value={line.description}
                      onChange={setLine(line.uid, "description")}
                    />
                  </Field>
                  <Field
                    label={t("common.quantity")}
                    htmlFor={`po-line-qty-${line.uid}`}
                    required
                    error={fieldError(error, `items.${index}.quantity`)}
                  >
                    <Input
                      id={`po-line-qty-${line.uid}`}
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={line.quantity}
                      onChange={setLine(line.uid, "quantity")}
                    />
                  </Field>
                  <Field label={t("common.unit")} htmlFor={`po-line-unit-${line.uid}`} error={fieldError(error, `items.${index}.unit`)}>
                    <Input
                      id={`po-line-unit-${line.uid}`}
                      maxLength={16}
                      value={line.unit}
                      onChange={setLine(line.uid, "unit")}
                    />
                  </Field>
                  <Field
                    label="Unit price"
                    htmlFor={`po-line-price-${line.uid}`}
                    required
                    error={fieldError(error, `items.${index}.unit_price`)}
                  >
                    <Input
                      id={`po-line-price-${line.uid}`}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={line.unit_price}
                      onChange={setLine(line.uid, "unit_price")}
                    />
                  </Field>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Row total:{" "}
                    <span className="font-semibold text-foreground">
                      <Money value={(Number(line.quantity) || 0) * (Number(line.unit_price) || 0)} />
                    </span>
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((item) => item.uid !== line.uid))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-critical-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            className="mt-3"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>

        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 sm:col-span-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("common.subtotal")}</span>
            <Money value={subtotal} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold">
            <span>{t("common.total")}</span>
            <Money value={subtotal} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
