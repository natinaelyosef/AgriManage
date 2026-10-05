"use client";

import { Suspense, useState } from "react";
import { CheckCircle2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { Activity, Lookups } from "@/lib/api/types";
import { titleCase } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ActivityFormDialog } from "@/components/features/activity-form";

const PRIORITIES = ["low", "medium", "high", "urgent"];

const PRIORITY_TONE: Record<string, "neutral" | "info" | "warning" | "critical"> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "critical",
};

const STATUS_TABS = ["", "pending", "in_progress", "completed", "cancelled"];

function ActivitiesContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at", filters: ["status", "type", "priority"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta, loading, refetch } = usePaginated<Activity>("/activities", list.params);
  const { data: lookups } = useResource<{ data: Lookups }>("/meta/lookups");

  const [editing, setEditing] = useState<Activity | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Activity | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/activities/${id}`));
  const advance = useMutation((input: { id: number; title: string; type: string; status: string }) =>
    apiClient.put(`/activities/${input.id}`, { title: input.title, type: input.type, status: input.status }),
  );

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const activityStatus = (activity: Activity) =>
    activity.status === "pending" ? "in_progress" : activity.status === "in_progress" ? "completed" : "";

  const runAdvance = async (activity: Activity) => {
    const next = activityStatus(activity);
    if (!next) return;
    try {
      await advance.run({ id: activity.id, title: activity.title, type: activity.type, status: next });
      void refetch();
    } catch (caught) {
      toast.error((caught as ApiError).message);
    }
  };

  const columns: Column<Activity>[] = [
    {
      key: "title",
      header: t("common.name"),
      render: (activity) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{activity.title}</p>
          <p className="text-xs text-muted-foreground">{titleCase(activity.type)}</p>
        </div>
      ),
    },
    {
      key: "scheduled_date",
      header: "Scheduled",
      render: (activity) => {
        const date = activity.scheduled_date;
        const overdue =
          date != null &&
          date.slice(0, 10) < today &&
          activity.status !== "completed" &&
          activity.status !== "cancelled";
        return (
          <span className={overdue ? "font-semibold text-critical-600" : ""}>
            <DateCell value={date} />
          </span>
        );
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (activity) => <Badge tone={PRIORITY_TONE[activity.priority] ?? "neutral"}>{titleCase(activity.priority)}</Badge>,
    },
    {
      key: "field",
      header: "Field",
      render: (activity) => <span className="text-sm">{activity.field?.name ?? "—"}</span>,
    },
    {
      key: "worker",
      header: "Worker",
      render: (activity) => <span className="text-sm">{activity.worker?.name ?? "—"}</span>,
    },
    { key: "status", header: t("common.status"), render: (activity) => <StatusBadge status={activity.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (activity) => {
        const next = activityStatus(activity);
        return (
          <div className="flex justify-end gap-1">
            {can("activity.edit") && next && (
              <Button
                size="sm"
                variant="ghost"
                disabled={advance.pending}
                onClick={() => void runAdvance(activity)}
                aria-label={next === "in_progress" ? "Start activity" : "Complete activity"}
                title={next === "in_progress" ? "Start" : "Complete"}
              >
                {next === "in_progress" ? (
                  <Play className="h-3.5 w-3.5 text-info-600" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
                )}
              </Button>
            )}
            {can("activity.edit") && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(activity)} aria-label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {can("activity.delete") && (
              <Button size="sm" variant="ghost" onClick={() => setDeleting(activity)} aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5 text-critical-600" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const tabLabel = (id: string) => {
    if (id === "") return t("common.all");
    if (id === "in_progress") return t("status.in_progress");
    if (id === "pending") return t("status.pending");
    if (id === "completed") return t("status.completed");
    return t("status.cancelled");
  };

  return (
    <div>
      <PageHeader
        title={t("nav.activities")}
        subtitle="Field work across every crop plan"
        actions={
          can("activity.create") ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t("action.create")}
            </Button>
          ) : undefined
        }
      />

      <Tabs
        className="mb-4"
        items={STATUS_TABS.map((id) => ({ id, label: tabLabel(id) }))}
        active={list.filters.status ?? ""}
        onChange={(id) => list.setFilter("status", id || null)}
      />

      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search title, type or description…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "priority",
            label: "Priority",
            options: PRIORITIES.map((value) => ({ value, label: titleCase(value) })),
          },
          {
            key: "type",
            label: t("common.type"),
            options: Object.entries(lookups?.data.activity_types ?? {}).map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(activity) => activity.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Schedule your first field activity to get started."
          caption={t("nav.activities")}
        />
        {meta && (
          <Pagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onPageChange={(page) => list.set({ page })}
          />
        )}
      </div>

      {creating && (
        <ActivityFormDialog
          activity={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <ActivityFormDialog
          key={editing.id}
          activity={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete activity"
        message={`Delete “${deleting?.title}”? This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Activity deleted");
            setDeleting(null);
            void refetch();
          } catch (error) {
            toast.error((error as ApiError).message);
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}
