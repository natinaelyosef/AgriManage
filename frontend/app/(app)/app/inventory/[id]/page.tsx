"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, ApiError } from "@/lib/api/client";
import type { InventoryItem, Lookups, StockMovement } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money, Quantity } from "@/components/ui/display";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiErrorBanner, fieldError } from "@/components/ui/form";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { InventoryFormDialog } from "@/components/features/inventory-form";

const MOVEMENT_TONES: Record<string, "success" | "warning" | "neutral"> = {
  in: "success",
  out: "warning",
  adjustment: "neutral",
};

function AdjustDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({ type: "in", quantity: "", unit_cost: "", reason: "", notes: "" });
  const [error, setError] = useState<ApiError | null>(null);

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const adjust = useMutation((payload: Record<string, unknown>) =>
    apiClient.post<{ data: InventoryItem }>(`/inventory-items/${item.id}/adjust`, payload),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await adjust.run({
        type: form.type,
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        reason: form.reason || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 422 && apiError.message.includes("negative")) {
        setError(
          new ApiError(`${apiError.message} Available: ${item.quantity} ${item.unit}.`, 422, apiError.details),
        );
      } else {
        setError(apiError);
      }
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      description={`${item.name} · ${item.quantity} ${item.unit} on hand`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t("action.cancel")}
          </Button>
          <Button variant="primary" form="adjust-form" type="submit" loading={adjust.pending}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <ApiErrorBanner error={error} />
      <form id="adjust-form" onSubmit={submit} className="grid gap-4">
        <fieldset>
          <legend className="label">Movement type</legend>
          <div className="flex flex-wrap gap-4 pt-1">
            {["in", "out", "adjustment"].map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm capitalize">
                <input
                  type="radio"
                  name="adjust-type"
                  value={type}
                  checked={form.type === type}
                  onChange={set("type")}
                  className="accent-brand-600"
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label={t("common.quantity")}
          htmlFor="adj-quantity"
          required
          hint={form.type === "adjustment" ? "Set the stock to this quantity." : undefined}
          error={fieldError(error, "quantity")}
        >
          <Input
            id="adj-quantity"
            type="number"
            step="0.001"
            min="0.001"
            required
            value={form.quantity}
            onChange={set("quantity")}
          />
        </Field>
        <Field label="Unit cost" htmlFor="adj-cost" error={fieldError(error, "unit_cost")}>
          <Input id="adj-cost" type="number" step="0.01" min="0" value={form.unit_cost} onChange={set("unit_cost")} />
        </Field>
        <Field label="Reason" htmlFor="adj-reason" error={fieldError(error, "reason")}>
          <Input id="adj-reason" value={form.reason} onChange={set("reason")} placeholder="Delivery, usage, stock count…" />
        </Field>
        <Field label={t("common.notes")} htmlFor="adj-notes" error={fieldError(error, "notes")}>
          <Textarea id="adj-notes" value={form.notes} onChange={set("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

function InventoryDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [movementPage, setMovementPage] = useState(1);

  const { data: payload, loading, refetch } = useResource<{ data: InventoryItem }>(
    `/inventory-items/${params.id}`,
  );
  const item = payload?.data;

  const {
    data: movementPayload,
    items: movements,
    meta: movementMeta,
    loading: movementsLoading,
    refetch: refetchMovements,
  } = usePaginated<StockMovement>(`/inventory-items/${params.id}/movements`, {
    per_page: 15,
    page: movementPage > 1 ? movementPage : undefined,
  });

  const { data: lookupPayload } = useResource<{ data: Lookups }>("/meta/lookups");
  const lookups = lookupPayload?.data;

  const refetchAll = () => {
    void refetch();
    void refetchMovements();
  };

  if (loading && !item) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (!item) {
    return <div className="card p-8 text-center text-sm text-muted-foreground">{t("common.notFound")}</div>;
  }

  const lowStock = item.reorder_level > 0 && item.quantity <= item.reorder_level;

  const movementColumns: Column<StockMovement>[] = [
    { key: "moved_at", header: t("common.date"), render: (movement) => <DateCell value={movement.moved_at} /> },
    {
      key: "type",
      header: t("common.type"),
      render: (movement) => (
        <Badge tone={MOVEMENT_TONES[movement.type] ?? "neutral"}>{titleCase(movement.type)}</Badge>
      ),
    },
    {
      key: "quantity",
      header: t("common.quantity"),
      align: "right",
      render: (movement) => <Quantity value={movement.quantity} unit={item.unit} />,
    },
    {
      key: "unit_cost",
      header: "Unit cost",
      align: "right",
      render: (movement) =>
        movement.unit_cost != null ? <Money value={movement.unit_cost} /> : "—",
    },
    { key: "reason", header: "Reason", render: (movement) => movement.reason ?? "—" },
    { key: "user", header: "By", render: (movement) => movement.user?.name ?? "—" },
  ];

  const stats: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("common.quantity"), value: <Quantity value={item.quantity} unit={item.unit} /> },
    { label: "Unit cost", value: <Money value={item.unit_cost} /> },
    { label: t("dashboard.kpi.inventoryValue"), value: <Money value={item.quantity * item.unit_cost} /> },
    { label: "Reorder level", value: <Quantity value={item.reorder_level} unit={item.unit} /> },
  ];

  return (
    <div>
      <button
        onClick={() => router.push("/app/inventory")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("nav.inventory")}
      </button>

      <PageHeader
        title={item.name}
        subtitle={[item.sku, lookups?.inventory_categories[item.category] ?? titleCase(item.category)]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <StatusBadge status={item.status} />
            {lowStock && <Badge tone="warning">Low</Badge>}
            {(can("inventory.receive") || can("inventory.issue")) && (
              <Button variant="primary" onClick={() => setAdjusting(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Adjust stock
              </Button>
            )}
            {can("inventory.edit") && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> {t("action.edit")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1.5 text-lg font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("common.details")}</h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted-foreground">Warehouse</dt>
            <dd className="font-medium">{item.warehouse ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted-foreground">Supplier</dt>
            <dd className="font-medium">{item.supplier_name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted-foreground">Expiry date</dt>
            <dd className="font-medium">
              <DateCell value={item.expiry_date} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted-foreground">{t("common.unit")}</dt>
            <dd className="font-medium">{item.unit || "—"}</dd>
          </div>
        </dl>
        {item.notes && <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p>}
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Stock movements</h2>
          <span className="text-xs text-muted-foreground">
            {movementMeta ? `${movementMeta.total} ${t("table.rows")}` : ""}
          </span>
        </div>
        <DataTable
          columns={movementColumns}
          rows={movements}
          rowKey={(movement) => movement.id}
          loading={movementsLoading && movements.length === 0 && !movementPayload}
          emptyTitle={t("table.empty")}
          emptyHint="Stock movements appear here after the first adjustment."
          caption="Stock movements"
        />
        {movementMeta && (
          <Pagination
            page={movementMeta.current_page}
            lastPage={movementMeta.last_page}
            total={movementMeta.total}
            onPageChange={setMovementPage}
          />
        )}
      </div>

      {editing && (
        <InventoryFormDialog
          item={item}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast.success(t("form.saved"));
            refetchAll();
          }}
        />
      )}

      {adjusting && (
        <AdjustDialog
          item={item}
          onClose={() => setAdjusting(false)}
          onSaved={() => {
            setAdjusting(false);
            toast.success("Stock updated");
            setMovementPage(1);
            refetchAll();
          }}
        />
      )}
    </div>
  );
}

export default function InventoryDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <InventoryDetailContent />
    </Suspense>
  );
}
