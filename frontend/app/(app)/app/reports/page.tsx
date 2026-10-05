"use client";

import { Suspense, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, Clock, Download, Lock, Receipt, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/api/hooks";
import type { ProfitabilityReport } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { CardSkeleton, EmptyState } from "@/components/ui/skeleton";
import { Quantity, Money } from "@/components/ui/display";
import { ApiErrorBanner } from "@/components/ui/form";
import { formatMoney, formatNumber, titleCase } from "@/lib/utils";

interface CashSummary {
  from: string;
  to: string;
  invoiced: number;
  received: number;
  outstanding: number;
  spent: number;
  net: number;
}

type RangeState = { groupBy: string; from: string; to: string };

const GROUP_OPTIONS = [
  { id: "farm", label: "Farm" },
  { id: "field", label: "Field" },
  { id: "crop", label: "Crop" },
  { id: "season", label: "Season" },
];

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaultRange(): RangeState {
  const now = new Date();
  return { groupBy: "farm", from: `${now.getFullYear()}-01-01`, to: isoDate(now) };
}

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

function ReportsContent() {
  const { t } = useI18n();
  const { can } = useAuth();

  const [draft, setDraft] = useState<RangeState>(() => defaultRange());
  const [applied, setApplied] = useState<RangeState>(() => defaultRange());

  const cash = useResource<{ data: CashSummary }>("/reports/cash-summary", {
    from: applied.from,
    to: applied.to,
  });
  const report = useResource<{ data: ProfitabilityReport }>("/reports/profitability", {
    group_by: applied.groupBy,
    from: applied.from,
    to: applied.to,
  });

  if (!can("report.view")) {
    return (
      <div className="card">
        <EmptyState title={t("common.unauthorized")} hint="Ask your organization owner to grant report access." icon={<Lock className="h-8 w-8 text-muted-foreground" aria-hidden />} />
      </div>
    );
  }

  const summary = cash.data?.data;
  const payload = report.data?.data;
  const rows = payload?.rows ?? [];
  const totals = payload?.totals;

  const setDraftValue = (key: keyof RangeState) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  const exportCsv = () => {
    const header = ["label", "quantity", "revenue", "expenses", "profit", "batches", "transactions"];
    const escape = (value: string | number) => {
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const body = rows.map((row) =>
      [row.label, row.quantity, row.revenue, row.expenses, row.profit, row.batches, row.transactions]
        .map(escape)
        .join(","),
    );
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `profitability-${applied.groupBy}-${applied.from}-${applied.to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const batchTotal = rows.reduce((sum, row) => sum + row.batches, 0);
  const transactionTotal = rows.reduce((sum, row) => sum + row.transactions, 0);

  const error = report.error ?? cash.error;

  return (
    <div>
      <PageHeader
        title={t("nav.reports")}
        subtitle="Profitability by farm, field, crop or season, with a cash summary for the same period"
        actions={
          <span className="badge border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {applied.from} → {applied.to}
          </span>
        }
      />

      {error && <ApiErrorBanner error={error} />}

      <div className="card mb-5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label">Group by</p>
            <Tabs
              items={GROUP_OPTIONS}
              active={draft.groupBy}
              onChange={(id) => setDraft((prev) => ({ ...prev, groupBy: id }))}
              className="border-b-0"
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t("common.from")} htmlFor="rp-from" className="w-36">
              <Input id="rp-from" type="date" value={draft.from} onChange={setDraftValue("from")} />
            </Field>
            <Field label={t("common.to")} htmlFor="rp-to" className="w-36">
              <Input id="rp-to" type="date" value={draft.to} onChange={setDraftValue("to")} />
            </Field>
            <Button variant="primary" onClick={() => setApplied(draft)}>
              Apply
            </Button>
            <Button
              variant="secondary"
              onClick={exportCsv}
              disabled={rows.length === 0 || !can("report.export")}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cash.loading && !summary ? (
          Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} rows={2} />)
        ) : (
          <>
            <StatCard
              label="Invoiced"
              value={<Money value={summary?.invoiced ?? 0} />}
              icon={<Receipt className="h-4 w-4" />}
            />
            <StatCard
              label="Received"
              value={<Money value={summary?.received ?? 0} />}
              icon={<Banknote className="h-4 w-4" />}
            />
            <StatCard
              label="Outstanding"
              value={<Money value={summary?.outstanding ?? 0} />}
              icon={<Clock className="h-4 w-4" />}
            />
            <StatCard
              label="Net"
              value={<Money value={summary?.net ?? 0} signed />}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      <div className="card mt-5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Revenue, expenses and profit by {titleCase(applied.groupBy)}</h2>
          <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Revenue
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning-500" /> Expenses
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-earth-500" /> Profit
            </span>
          </div>
        </div>
        {report.loading && !payload ? (
          <div className="h-72" aria-busy>
            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("table.noResults")}</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [formatMoney(Number(value)), titleCase(String(name))]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#3a9550" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#897453" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "row" : "rows"} · {titleCase(applied.groupBy)}
          </p>
        </div>

        {report.loading && !payload ? (
          <div className="space-y-3 p-4" aria-busy>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-4 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t("table.noResults")}
            hint="No sales or expenses were recorded for this period. Try a wider date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <caption className="sr-only">Profitability by {applied.groupBy}</caption>
              <thead>
                <tr>
                  <th scope="col">{titleCase(applied.groupBy)}</th>
                  <th scope="col" className="text-right">
                    {t("common.quantity")}
                  </th>
                  <th scope="col" className="text-right">
                    {t("dashboard.kpi.revenue")}
                  </th>
                  <th scope="col" className="text-right">
                    {t("dashboard.kpi.expenses")}
                  </th>
                  <th scope="col" className="text-right">
                    {t("dashboard.kpi.profit")}
                  </th>
                  <th scope="col" className="text-right">
                    Batches
                  </th>
                  <th scope="col" className="text-right">
                    Transactions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="font-medium">{row.label}</td>
                    <td className="text-right tabular-nums">
                      <Quantity value={row.quantity} />
                    </td>
                    <td className="text-right tabular-nums">
                      <Money value={row.revenue} />
                    </td>
                    <td className="text-right tabular-nums">
                      <Money value={row.expenses} />
                    </td>
                    <td
                      className={
                        row.profit >= 0
                          ? "text-right font-semibold tabular-nums text-success-600"
                          : "text-right font-semibold tabular-nums text-critical-600"
                      }
                    >
                      <Money value={row.profit} />
                    </td>
                    <td className="text-right tabular-nums">{formatNumber(row.batches)}</td>
                    <td className="text-right tabular-nums">{formatNumber(row.transactions)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-background font-bold">
                  <td className="border-t border-border px-3.5 py-2.5">{t("common.total")}</td>
                  <td className="border-t border-border px-3.5 py-2.5 text-right tabular-nums">
                    <Quantity value={totals?.quantity ?? 0} />
                  </td>
                  <td className="border-t border-border px-3.5 py-2.5 text-right tabular-nums">
                    <Money value={totals?.revenue ?? 0} />
                  </td>
                  <td className="border-t border-border px-3.5 py-2.5 text-right tabular-nums">
                    <Money value={totals?.expenses ?? 0} />
                  </td>
                  <td className="border-t border-border px-3.5 py-2.5 text-right tabular-nums">
                    <Money value={totals?.profit ?? 0} />
                  </td>
                  <td className="border-t border-border px-3.5 py-2.5 text-right tabular-nums">{formatNumber(batchTotal)}</td>
                  <td className="border-t border-border px-3.5 py-2.5 text-right tabular-nums">{formatNumber(transactionTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ReportsContent />
    </Suspense>
  );
}
