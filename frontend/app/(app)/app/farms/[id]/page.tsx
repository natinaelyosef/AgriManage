"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Sprout } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/api/hooks";
import type { Farm, Field } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Area } from "@/components/ui/display";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { FarmFormDialog } from "@/components/features/farm-form";

function FarmDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const { data: payload, loading, refetch } = useResource<{ data: Farm }>(`/farms/${params.id}`);
  const farm = payload?.data;

  if (loading && !farm) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (!farm) {
    return <div className="card p-8 text-center text-sm text-muted-foreground">{t("common.notFound")}</div>;
  }

  const fieldColumns: Column<Field>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (field) => (
        <Link href={`/app/fields/${field.id}`} className="font-medium hover:text-brand-700">
          {field.name}
        </Link>
      ),
    },
    { key: "code", header: "Code", render: (field) => <span className="font-mono text-xs">{field.code ?? "—"}</span> },
    { key: "area", header: t("common.area"), align: "right", render: (field) => <Area value={field.area_hectares} /> },
    { key: "soil", header: "Soil", render: (field) => field.soil_type ?? "—" },
    { key: "irrigation", header: "Irrigation", render: (field) => field.irrigation_type ?? "—" },
    { key: "status", header: t("common.status"), render: (field) => <StatusBadge status={field.status} /> },
  ];

  const stats: Array<{ label: string; value: string }> = [
    { label: t("common.area"), value: `${farm.area_hectares} ha` },
    { label: t("dashboard.kpi.cultivated"), value: `${farm.cultivated_hectares} ha` },
    { label: "Fields", value: String(farm.fields?.length ?? 0) },
    { label: "Location", value: [farm.region, farm.woreda, farm.kebele].filter(Boolean).join(" · ") || "—" },
  ];

  return (
    <div>
      <button onClick={() => router.push("/app/farms")} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("nav.farms")}
      </button>

      <PageHeader
        title={farm.name}
        subtitle={[farm.code, farm.type].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusBadge status={farm.status} />
            {can("farm.edit") && (
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

      {farm.description && (
        <div className="card mt-4 p-4">
          <h2 className="mb-1 text-sm font-semibold">{t("common.description")}</h2>
          <p className="text-sm text-muted-foreground">{farm.description}</p>
        </div>
      )}

      <div className="card mt-4">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sprout className="h-4 w-4 text-muted-foreground" /> {t("nav.fields")}
          </h2>
          <Link href={`/app/fields?farm_id=${farm.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
            {t("action.viewAll")}
          </Link>
        </div>
        <DataTable
          columns={fieldColumns}
          rows={farm.fields ?? []}
          rowKey={(field) => field.id}
          emptyTitle={t("table.empty")}
          emptyHint="Add fields to this farm to start planning crops."
        />
      </div>

      {editing && (
        <FarmFormDialog
          farm={farm}
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

export default function FarmDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <FarmDetailContent />
    </Suspense>
  );
}
