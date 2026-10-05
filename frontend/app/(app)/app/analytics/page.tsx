"use client";

import { Suspense, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Lock, MapPin, Receipt, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/api/hooks";
import type { AnalyticsPayload, MappedField } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton, EmptyState } from "@/components/ui/skeleton";
import { Area, Money } from "@/components/ui/display";
import { ApiErrorBanner } from "@/components/ui/form";
import { cn, formatMoney, formatNumber, titleCase } from "@/lib/utils";

const MAP_W = 1000;
const MAP_H = 600;
const MAP_PAD = 30;

const CROP_COLORS = ["#3a9550", "#897453", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#eab308"];

const UNCROPPED_COLOR = "#9ca3af";

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="rounded-lg bg-brand-50 p-1.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function AnalyticsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const [selected, setSelected] = useState<MappedField | null>(null);

  const { data, loading, error } = useResource<{ data: AnalyticsPayload }>("/reports/analytics");

  if (!can("report.view")) {
    return (
      <div className="card">
        <EmptyState
          title={t("common.unauthorized")}
          hint="Ask your organization owner to grant report access."
          icon={<Lock className="h-8 w-8 text-muted-foreground" aria-hidden />}
        />
      </div>
    );
  }

  const payload = data?.data;
  const trends = payload?.trends;
  const forecast = payload?.forecast;
  const cashflow = payload?.cashflow;
  const fieldMap = payload?.field_map;

  const months = trends?.months ?? [];
  const forecastRows = forecast?.rows ?? [];
  const cashflowMonths = cashflow?.months ?? [];
  const fields = fieldMap?.fields ?? [];
  const bounds = fieldMap?.bounds ?? null;
  const positioned = fields.filter((field) => field.latitude !== null && field.longitude !== null);
  const hasMap = bounds !== null && positioned.length > 0;

  const fieldCount = fieldMap?.totals.fields ?? 0;
  const totalArea = fieldMap?.totals.area_hectares ?? 0;

  const crops = Array.from(
    new Set(fields.map((field) => field.crop).filter((crop): crop is string => crop !== null)),
  );
  const colorForCrop = (crop: string | null) =>
    crop === null ? UNCROPPED_COLOR : CROP_COLORS[crops.indexOf(crop) % CROP_COLORS.length];

  const roots = positioned.map((field) => Math.sqrt(field.area_hectares));
  const minRoot = roots.length > 0 ? Math.min(...roots) : 0;
  const maxRoot = roots.length > 0 ? Math.max(...roots) : 0;
  const radiusFor = (field: MappedField) => {
    const root = Math.sqrt(field.area_hectares);
    if (maxRoot === minRoot) return 17;
    return 6 + ((root - minRoot) / (maxRoot - minRoot)) * 22;
  };

  const project = (field: MappedField) => {
    if (!bounds) return { x: MAP_W / 2, y: MAP_H / 2 };
    const innerW = MAP_W - MAP_PAD * 2;
    const innerH = MAP_H - MAP_PAD * 2;
    const lngSpan = bounds.max_longitude - bounds.min_longitude;
    const latSpan = bounds.max_latitude - bounds.min_latitude;
    const lng = field.longitude ?? 0;
    const lat = field.latitude ?? 0;
    const x = lngSpan === 0 ? MAP_PAD + innerW / 2 : MAP_PAD + ((lng - bounds.min_longitude) / lngSpan) * innerW;
    const y = latSpan === 0 ? MAP_PAD + innerH / 2 : MAP_PAD + ((bounds.max_latitude - lat) / latSpan) * innerH;
    return { x, y };
  };

  const forecastChartRows = forecastRows.map((row) => ({
    crop: row.crop,
    forecast_quantity: row.forecast_quantity ?? 0,
  }));

  const chartAxis = { fontSize: 11, fill: "var(--muted-foreground)" };

  return (
    <div>
      <PageHeader
        title={t("nav.analytics")}
        subtitle="Twelve-month trends, yield forecast, cash flow outlook and field map"
        actions={
          trends ? (
            <span className="badge border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {trends.from} → {trends.to}
            </span>
          ) : undefined
        }
      />

      {error && <ApiErrorBanner error={error} />}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <CardSkeleton key={index} rows={2} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("dashboard.kpi.revenue")}
              value={<Money value={trends?.totals.revenue ?? 0} />}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label={t("dashboard.kpi.expenses")}
              value={<Money value={trends?.totals.expenses ?? 0} />}
              icon={<Receipt className="h-4 w-4" />}
            />
            <StatCard
              label={t("dashboard.kpi.profit")}
              value={<Money value={trends?.totals.profit ?? 0} signed />}
              icon={<Wallet className="h-4 w-4" />}
            />
            <StatCard
              label={t("dashboard.kpi.receivables")}
              value={<Money value={cashflow?.receivables ?? 0} />}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>

          <div className="card mt-5 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Last 12 months</h2>
                <p className="text-xs text-muted-foreground">
                  Revenue, expenses and profit
                  {trends ? ` · ${trends.from} → ${trends.to}` : ""}
                </p>
              </div>
            </div>
            {months.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("table.noResults")}</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={months} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={false} />
                    <YAxis tick={chartAxis} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value, name) => [formatMoney(Number(value)), titleCase(String(name))]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3a9550" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#897453" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Yield forecast</h2>
                  {forecast?.season && <Badge tone="brand">{forecast.season}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(forecastRows.length)} {forecastRows.length === 1 ? "crop" : "crops"}
                </p>
              </div>
              {forecastRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("table.noResults")}</p>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecastChartRows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="crop" tick={chartAxis} tickLine={false} axisLine={false} />
                        <YAxis tick={chartAxis} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value, name) => [formatNumber(Number(value)), titleCase(String(name))]}
                        />
                        <Bar dataKey="forecast_quantity" name="Forecast" fill="#3a9550" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="table-base">
                      <caption className="sr-only">Yield forecast by crop</caption>
                      <thead>
                        <tr>
                          <th scope="col">Crop</th>
                          <th scope="col" className="text-right">
                            Yield per ha
                          </th>
                          <th scope="col" className="text-right">
                            Planned area
                          </th>
                          <th scope="col" className="text-right">
                            Forecast
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastRows.map((row) => (
                          <tr key={row.crop}>
                            <td className="font-medium">{row.crop}</td>
                            <td className="text-right tabular-nums">
                              {row.historical_yield_per_ha === null
                                ? "—"
                                : `${formatNumber(row.historical_yield_per_ha, 1)} per ha`}
                            </td>
                            <td className="text-right tabular-nums">
                              <Area value={row.planned_area_hectares} />
                            </td>
                            <td className="text-right tabular-nums">
                              {row.forecast_quantity === null
                                ? "—"
                                : `${formatNumber(row.forecast_quantity)} ${row.yield_unit}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Cash flow outlook</h2>
                  <p className="text-xs text-muted-foreground">
                    Opening balance: <Money value={cashflow?.opening_balance ?? 0} />
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(cashflowMonths.length)} {cashflowMonths.length === 1 ? "month" : "months"}
                </p>
              </div>
              {cashflowMonths.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("table.noResults")}</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cashflowMonths} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={false} />
                      <YAxis tick={chartAxis} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => [formatMoney(Number(value)), titleCase(String(name))]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="inflow.total" name="Inflow" fill="#3a9550" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="outflow.total" name="Outflow" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#897453" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="card mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Field map</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(fieldCount)} {fieldCount === 1 ? "field" : "fields"} · <Area value={totalArea} />
              </p>
            </div>
            {!hasMap ? (
              <EmptyState
                title="No geolocated fields yet."
                hint="Add latitude and longitude to your fields to see them plotted here."
                icon={<MapPin className="h-8 w-8 text-muted-foreground" aria-hidden />}
              />
            ) : (
              <div className="grid gap-5 p-4 lg:grid-cols-2">
                <div className="min-w-0">
                  <svg
                    viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                    className="aspect-[5/3] w-full rounded-lg border border-border bg-muted/30"
                    role="img"
                    aria-label="Field map"
                  >
                    {positioned.map((field) => {
                      const { x, y } = project(field);
                      const isSelected = selected?.id === field.id;
                      return (
                        <circle
                          key={field.id}
                          cx={x}
                          cy={y}
                          r={radiusFor(field)}
                          fill={colorForCrop(field.crop)}
                          stroke={isSelected ? "var(--foreground)" : "#ffffff"}
                          strokeWidth={isSelected ? 2 : 1}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onClick={() => setSelected(field)}
                        >
                          <title>{`${field.name} · ${field.farm ?? "—"} · ${field.crop ?? "—"} · ${formatNumber(
                            field.area_hectares,
                            2,
                          )} ha`}</title>
                        </circle>
                      );
                    })}
                  </svg>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {crops.map((crop) => (
                      <span key={crop} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorForCrop(crop) }} />
                        {crop}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: UNCROPPED_COLOR }} />
                      Uncropped
                    </span>
                  </div>

                  {selected ? (
                    <div className="mt-3 rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{selected.name}</p>
                        <Badge>{titleCase(selected.status)}</Badge>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                        <div>
                          <dt className="text-muted-foreground">Farm</dt>
                          <dd className="font-medium">{selected.farm ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Crop</dt>
                          <dd className="font-medium">{selected.crop ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Area</dt>
                          <dd className="font-medium tabular-nums">
                            <Area value={selected.area_hectares} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Status</dt>
                          <dd className="font-medium">{titleCase(selected.status)}</dd>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <dt className="text-muted-foreground">Coordinates</dt>
                          <dd className="font-medium tabular-nums">
                            {selected.latitude !== null && selected.longitude !== null
                              ? `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">Select a field to see its details.</p>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="label">All fields</p>
                  <ul className="max-h-72 overflow-y-auto rounded-lg border border-border">
                    {fields.map((field) => (
                      <li
                        key={field.id}
                        className={cn(
                          "border-b border-border last:border-b-0",
                          selected?.id === field.id && "bg-brand-50 dark:bg-brand-900/30",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected(field)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{field.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {field.farm ?? "—"} · {field.crop ?? "—"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            <Area value={field.area_hectares} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
