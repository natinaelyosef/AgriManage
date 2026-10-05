"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Pencil, Wheat } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useResource, usePaginated } from "@/lib/api/hooks";
import type { Paginated } from "@/lib/api/client";
import type { Activity, CropPlan, Field, HarvestBatch } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Area, DateCell, Money, Quantity } from "@/components/ui/display";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PlanFormDialog } from "@/components/features/plan-form";

function PlanDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const { data: payload, loading, refetch } = useResource<{ data: CropPlan }>(`/crop-plans/${params.id}`);
  const plan = payload?.data;
  const fieldPayload = useResource<{ data: Field }>(plan ? `/fields/${plan.field_id}` : null);

  const harvests = usePaginated<HarvestBatch>("/harvest-batches", {
    crop_plan_id: params.id,
    per_page: 10,
    sort: "-harvest_date",
  });
  const activitiesPayload = useResource<Paginated<Activity>>("/activities", {
    crop_plan_id: params.id,
    per_page: 100,
    sort: "scheduled_date",
  });
  const activities = (activitiesPayload.data?.data ?? [])
    .filter((activity) => activity.crop_plan_id === Number(params.id))
    .slice(0, 10);

  if (loading && !plan) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (!plan) {
    return <div className="card p-8 text-center text-sm text-muted-foreground">{t("common.notFound")}</div>;
  }

  const progress =
    plan.expected_yield > 0 ? Math.min(100, Math.round((plan.actual_yield / plan.expected_yield) * 100)) : 0;

  const stats: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("common.area"), value: <Area value={plan.planned_area_hectares} /> },
    { label: "Expected yield", value: <Quantity value={plan.expected_yield ?? 0} unit={plan.yield_unit} /> },
    { label: "Actual yield", value: <Quantity value={plan.actual_yield ?? 0} unit={plan.yield_unit} /> },
    { label: "Estimated cost", value: <Money value={plan.estimated_cost ?? 0} /> },
  ];

  const farmName = fieldPayload.data?.data.farm?.name;

  const details: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Season", value: plan.season?.name ?? "—" },
    {
      label: "Field",
      value: (
        <span>
          {plan.field?.name ?? "—"}
          {farmName ? ` · ${farmName}` : ""}
        </span>
      ),
    },
    { label: "Planting date", value: <DateCell value={plan.planting_date} /> },
    { label: "Expected harvest", value: <DateCell value={plan.expected_harvest_date} /> },
  ];

  const harvestColumns: Column<HarvestBatch>[] = [
    {
      key: "batch",
      header: "Batch",
      render: (batch) => <span className="font-mono text-xs">{batch.batch_number}</span>,
    },
    { key: "date", header: t("common.date"), render: (batch) => <DateCell value={batch.harvest_date} /> },
    {
      key: "quantity",
      header: t("common.quantity"),
      align: "right",
      render: (batch) => <Quantity value={batch.quantity} unit={batch.unit} />,
    },
    { key: "status", header: t("common.status"), render: (batch) => <StatusBadge status={batch.status} /> },
  ];

  const activityColumns: Column<Activity>[] = [
    { key: "title", header: t("common.name"), render: (activity) => <span className="text-sm">{activity.title}</span> },
    { key: "date", header: "Scheduled", render: (activity) => <DateCell value={activity.scheduled_date} /> },
    { key: "type", header: t("common.type"), render: (activity) => <span className="text-sm">{activity.type}</span> },
    { key: "status", header: t("common.status"), render: (activity) => <StatusBadge status={activity.status} /> },
  ];

  return (
    <div>
      <button
        onClick={() => router.push("/app/plans")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("nav.cropPlans")}
      </button>

      <PageHeader
        title={plan.crop?.name ?? "Crop plan"}
        subtitle={[plan.variety, plan.season?.name, plan.field?.name].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusBadge status={plan.status} />
            {can("plan.edit") && (
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
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{detail.label}</dt>
              <dd className="text-sm font-medium">{detail.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Yield progress</span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(plan.actual_yield ?? 0, 2)} / {formatNumber(plan.expected_yield ?? 0, 2)}
              {plan.yield_unit ? ` ${plan.yield_unit}` : ""} · {progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
          </div>
        </div>
        {plan.notes && <p className="mt-4 text-sm text-muted-foreground">{plan.notes}</p>}
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Wheat className="h-4 w-4 text-muted-foreground" /> Recorded harvests
          </h2>
          <Link href="/app/harvest" className="text-xs font-semibold text-brand-700 hover:underline">
            {t("action.viewAll")}
          </Link>
        </div>
        <DataTable
          columns={harvestColumns}
          rows={harvests.items}
          rowKey={(batch) => batch.id}
          loading={harvests.loading && harvests.items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="No harvest batches recorded for this plan yet."
        />
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-muted-foreground" /> Activities
          </h2>
          <Link href="/app/activities" className="text-xs font-semibold text-brand-700 hover:underline">
            {t("action.viewAll")}
          </Link>
        </div>
        <DataTable
          columns={activityColumns}
          rows={activities}
          rowKey={(activity) => activity.id}
          loading={activitiesPayload.loading && activities.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="No activities scheduled for this plan yet."
        />
      </div>

      {editing && (
        <PlanFormDialog
          key={plan.id}
          plan={plan}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast.success(t("form.saved"));
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export default function PlanDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <PlanDetailContent />
    </Suspense>
  );
}
