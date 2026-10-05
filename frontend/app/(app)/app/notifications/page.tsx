"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BellRing, CheckCheck, Lock, SearchX } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { useMutation, usePaginated } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { NotificationRecord } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/data-table";
import { Select } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Badge, SeverityBadge } from "@/components/ui/badge";
import { DateCell } from "@/components/ui/display";
import { EmptyState } from "@/components/ui/skeleton";
import { ApiErrorBanner } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const SEVERITIES = ["INFO", "WARNING", "CRITICAL", "EMERGENCY"];

function NotificationsContent() {
  const { t } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at", filters: ["severity"], perPage: 15 });
  const [pendingId, setPendingId] = useState<number | null>(null);

  const { items, meta, loading, error, refetch } = usePaginated<NotificationRecord>("/notifications", list.params);

  const markOne = useMutation((id: number) => apiClient.post(`/notifications/${id}/read`));
  const markAll = useMutation(() => apiClient.post<{ data: { updated: number } }>("/notifications/read-all"));

  if (!can("notification.view")) {
    return (
      <div className="card">
        <EmptyState
          title={t("common.unauthorized")}
          hint="Notifications are limited to members with notification access."
          icon={<Lock className="h-8 w-8 text-muted-foreground" aria-hidden />}
        />
      </div>
    );
  }

  const unread = meta?.unread ?? 0;
  const unreadOnly = list.filters.unread === "1";

  const handleMarkRead = async (id: number) => {
    setPendingId(id);
    try {
      await markOne.run(id);
      void refetch();
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAll.run(null);
      toast.success("All notifications marked as read");
      void refetch();
    } catch (caught) {
      toast.error((caught as ApiError).message);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("nav.notifications")}
        subtitle={unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You are all caught up"}
        actions={
          <Button
            variant="secondary"
            onClick={handleMarkAll}
            loading={markAll.pending}
            disabled={unread === 0}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      {error && <ApiErrorBanner error={error} />}

      <Tabs
        items={[
          { id: "all", label: t("common.all"), count: meta?.total },
          { id: "unread", label: "Unread", count: unread },
        ]}
        active={unreadOnly ? "unread" : "all"}
        onChange={(id) => list.setFilter("unread", id === "unread" ? "1" : null)}
        className="mb-4"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={list.filters.severity ?? ""}
          onChange={(event) => list.setFilter("severity", event.target.value || null)}
          className="w-auto min-w-44"
          aria-label="Severity"
        >
          <option value="">All severities</option>
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </Select>
        {Object.keys(list.filters).length > 0 && (
          <Button variant="ghost" size="sm" onClick={list.reset}>
            <SearchX className="h-4 w-4" /> {t("action.clear")}
          </Button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-3" aria-busy>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card h-24 animate-pulse bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={unreadOnly ? "No unread notifications" : t("table.empty")}
            hint={
              unreadOnly
                ? "Everything has been read. Switch to All to review earlier alerts."
                : "Alerts about stock, payments and overdue activities will appear here."
            }
            icon={<BellRing className="h-8 w-8 text-muted-foreground" aria-hidden />}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isUnread = !item.read_at;
            return (
              <li
                key={item.id}
                className={cn("card p-4", isUnread && "border-brand-500/40 bg-brand-50/40 dark:bg-brand-900/20")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />
                      )}
                      <p className={cn("text-sm", isUnread ? "font-semibold" : "font-medium")}>{item.title}</p>
                    </div>
                    {item.message && <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>}
                  </div>
                  <SeverityBadge severity={item.severity} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <DateCell value={item.created_at} />
                    {item.entity_type && <Badge>{item.entity_type}</Badge>}
                    {item.action_url && (
                      <Link
                        href={item.action_url}
                        className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                      >
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  {isUnread && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkRead(item.id)}
                      loading={markOne.pending && pendingId === item.id}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {meta && (
        <div className="card mt-4">
          <Pagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onPageChange={(page) => list.set({ page })}
          />
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <NotificationsContent />
    </Suspense>
  );
}
