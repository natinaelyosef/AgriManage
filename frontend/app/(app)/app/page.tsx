"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Droplets,
  Map as MapIcon,
  Package,
  Sprout,
  Users,
  Wheat,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import { Area, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { useResource } from "@/lib/api/hooks";
import type { Activity, CropPlan, DashboardPayload, HarvestBatch, NotificationRecord } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { DateCell, Money } from "@/components/ui/display";
import { CardSkeleton } from "@/components/ui/skeleton";
import { cn, formatNumber, titleCase } from "@/lib/utils";

function KpiCard({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="rounded-lg bg-brand-50 p-1.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "positive" && "text-success-600",
            tone === "negative" && "text-critical-600",
            tone === "neutral" && "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: payload, loading } = useResource<{ data: DashboardPayload }>("/dashboard");
  const dashboard = payload?.data;

  const kpis = dashboard?.kpis;

  const trendData = useMemo(
    () =>
      (dashboard?.trend ?? []).map((row) => ({
        ...row,
        label: new Date(`${row.month}-01T00:00:00`).toLocaleDateString("en", { month: "short" }),
      })),
    [dashboard?.trend],
  );

  return (
    <div>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        actions={
          <Link href="/app/plans" className="btn btn-secondary">
            {t("nav.cropPlans")}
          </Link>
        }
      />

      {loading && !dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <CardSkeleton key={index} rows={2} />
          ))}
        </div>
      ) : dashboard && kpis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t("dashboard.kpi.farms")}
              value={formatNumber(kpis.farms)}
              icon={<MapIcon className="h-4 w-4" />}
              hint={`${formatNumber(kpis.total_hectares, 2)} ha · ${formatNumber(kpis.cultivated_hectares, 2)} ha ${t(
                "dashboard.kpi.cultivated",
              ).toLowerCase()}`}
            />
            <KpiCard
              label={t("dashboard.kpi.activePlans")}
              value={formatNumber(kpis.active_plans)}
              icon={<Sprout className="h-4 w-4" />}
              hint={`${formatNumber(kpis.fields)} ${t("dashboard.kpi.fields").toLowerCase()}`}
            />
            <KpiCard
              label={t("dashboard.kpi.workers")}
              value={formatNumber(kpis.workers)}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              label={t("dashboard.kpi.revenue")}
              value={<Money value={kpis.revenue} />}
              icon={<ArrowUpRight className="h-4 w-4" />}
              tone="positive"
            />
            <KpiCard
              label={t("dashboard.kpi.expenses")}
              value={<Money value={kpis.expenses} />}
              icon={<ArrowDownRight className="h-4 w-4" />}
              tone={kpis.expenses > kpis.revenue ? "negative" : "neutral"}
            />
            <KpiCard
              label={t("dashboard.kpi.profit")}
              value={<Money value={kpis.profit} />}
              icon={<ArrowUpRight className="h-4 w-4" />}
              tone={kpis.profit >= 0 ? "positive" : "negative"}
              hint={kpis.revenue > 0 ? `${formatNumber((kpis.profit / kpis.revenue) * 100, 1)}% margin` : undefined}
            />
            <KpiCard
              label={t("dashboard.kpi.receivables")}
              value={<Money value={kpis.receivables} />}
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <KpiCard
              label={t("dashboard.kpi.inventoryValue")}
              value={<Money value={kpis.inventory_value} />}
              icon={<Package className="h-4 w-4" />}
              hint={`${kpis.low_stock_count} ${t("dashboard.kpi.lowStock").toLowerCase()} · ${
                kpis.pending_verifications
              } ${t("dashboard.kpi.pendingVerifications").toLowerCase()}`}
              tone={kpis.low_stock_count > 0 ? "negative" : "neutral"}
            />
            <KpiCard
              label={t("dashboard.kpi.waterUsage")}
              value={`${formatNumber(kpis.water_usage_m3, 1)} m³`}
              icon={<Droplets className="h-4 w-4" />}
            />
            <KpiCard
              label={t("dashboard.kpi.overdueMaintenance")}
              value={formatNumber(kpis.overdue_maintenance)}
              icon={<Wrench className="h-4 w-4" />}
              tone={kpis.overdue_maintenance > 0 ? "negative" : "neutral"}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <div className="card p-4 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t("dashboard.trend")}</h2>
                <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-brand-500" /> {t("dashboard.kpi.revenue")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-warning-500" /> {t("dashboard.kpi.expenses")}
                  </span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [formatNumber(Number(value), 0), titleCase(String(name))]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3a9550" fill="#3a9550" fillOpacity={0.15} strokeWidth={2} />
                    <Bar dataKey="expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={10} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">{t("dashboard.today")}</h2>
              {dashboard.today.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("table.empty")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {dashboard.today.slice(0, 6).map((activity: Activity) => (
                    <li key={activity.id} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          activity.status === "completed"
                            ? "bg-success-500"
                            : activity.status === "in_progress"
                              ? "bg-info-500"
                              : "bg-warning-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{activity.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {activity.field && <span className="truncate">{activity.field.name}</span>}
                          <StatusBadge status={activity.status} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/app/activities" className="mt-3 block text-center text-xs font-semibold text-brand-700 hover:underline">
                {t("action.viewAll")}
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-muted-foreground" /> {t("dashboard.upcomingHarvests")}
              </h2>
              <ul className="space-y-2.5">
                {dashboard.upcoming_harvests.length === 0 && (
                  <li className="py-4 text-center text-sm text-muted-foreground">{t("table.empty")}</li>
                )}
                {dashboard.upcoming_harvests.map((plan: CropPlan) => (
                  <li key={plan.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {plan.crop?.name}
                        {plan.variety ? ` · ${plan.variety}` : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{plan.field?.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold">
                        <DateCell value={plan.expected_harvest_date} />
                      </p>
                      <StatusBadge status={plan.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Wheat className="h-4 w-4 text-muted-foreground" /> {t("dashboard.recentHarvests")}
              </h2>
              <ul className="space-y-2.5">
                {dashboard.recent_harvests.length === 0 && (
                  <li className="py-4 text-center text-sm text-muted-foreground">{t("table.empty")}</li>
                )}
                {dashboard.recent_harvests.map((batch: HarvestBatch) => (
                  <li key={batch.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{batch.batch_number}</p>
                      <p className="truncate text-xs text-muted-foreground">{batch.crop?.name ?? "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold tabular-nums">
                        {formatNumber(batch.quantity)} {batch.unit}
                      </p>
                      <DateCell value={batch.harvest_date} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-muted-foreground" /> {t("dashboard.lowStock")}
              </h2>
              <ul className="space-y-2.5">
                {dashboard.low_stock.length === 0 && (
                  <li className="py-4 text-center text-sm text-muted-foreground">—</li>
                )}
                {dashboard.low_stock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <p className="min-w-0 truncate font-medium">{item.name}</p>
                    <Badge tone={item.quantity <= 0 ? "critical" : "warning"}>
                      {formatNumber(item.quantity)} / {formatNumber(item.reorder_level)} {item.unit}
                    </Badge>
                  </li>
                ))}
              </ul>
              <Link href="/app/inventory" className="mt-3 block text-center text-xs font-semibold text-brand-700 hover:underline">
                {t("action.viewAll")}
              </Link>
            </div>

            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" /> {t("dashboard.alerts")}
              </h2>
              <ul className="space-y-2.5">
                {dashboard.alerts.length === 0 && (
                  <li className="py-4 text-center text-sm text-muted-foreground">{t("table.empty")}</li>
                )}
                {dashboard.alerts.map((alert: NotificationRecord) => (
                  <li key={alert.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    {alert.message && <p className="mt-1 text-xs text-muted-foreground">{alert.message}</p>}
                    <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                      <DateCell value={alert.created_at} />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-8 text-center text-sm text-muted-foreground">{t("form.error")}</div>
      )}
    </div>
  );
}
