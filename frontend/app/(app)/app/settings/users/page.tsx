"use client";

import { Suspense, useState } from "react";
import { Check, Info, Lock, Minus, Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListQuery } from "@/lib/api/list";
import { usePaginated, useMutation, useResource } from "@/lib/api/hooks";
import { apiClient, type ApiError } from "@/lib/api/client";
import type { OrgUser } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedSearch, ListToolbar } from "@/components/layout/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { CardSkeleton, EmptyState } from "@/components/ui/skeleton";
import { ApiErrorBanner } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { UserFormDialog, type RoleOption } from "@/components/features/user-form";
import { cn, titleCase } from "@/lib/utils";

interface PermissionEntry {
  key: string;
  name: string;
  module: string;
}

type Catalog = Record<string, PermissionEntry[]> | PermissionEntry[];

interface PermissionsPayload {
  data: {
    catalog: Catalog;
    roles: Record<string, string>;
    role_permissions: Record<string, string[]>;
    role_ids: Record<string, number>;
  };
}

interface PermissionGroup {
  label: string;
  entries: PermissionEntry[];
}

function toGroups(catalog: Catalog): PermissionGroup[] {
  if (Array.isArray(catalog)) {
    const buckets = new Map<string, PermissionEntry[]>();
    catalog.forEach((entry) => {
      const label = titleCase(entry.module ?? "other");
      const existing = buckets.get(label);
      if (existing) existing.push(entry);
      else buckets.set(label, [entry]);
    });
    return Array.from(buckets, ([label, entries]) => ({ label, entries }));
  }
  return Object.entries(catalog).map(([label, entries]) => ({ label, entries }));
}

function roleOptions(payload: PermissionsPayload["data"] | undefined): RoleOption[] {
  if (!payload?.role_ids) return [];
  return Object.entries(payload.role_ids).map(([slug, id]) => ({
    id,
    slug,
    name: payload.roles[slug] ?? titleCase(slug),
  }));
}

function MembersContent({ meta }: { meta: PermissionsPayload["data"] | undefined }) {
  const { t } = useI18n();
  const { can, user: currentUser } = useAuth();
  const toast = useToast();
  const list = useListQuery({ sort: "-created_at", filters: ["status", "role_id"] });
  const [search, onSearchChange] = useDebouncedSearch(list.set);

  const { items, meta: pageMeta, loading, error, refetch } = usePaginated<OrgUser>("/users", list.params);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OrgUser | null>(null);
  const [deleting, setDeleting] = useState<OrgUser | null>(null);

  const remove = useMutation((id: number) => apiClient.delete(`/users/${id}`));

  const roles = roleOptions(meta);

  const columns: Column<OrgUser>[] = [
    {
      key: "member",
      header: t("common.name"),
      render: (member) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {member.name}
              {member.id === currentUser?.id && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (member) =>
        member.role ? (
          <Badge tone="brand">{member.role.name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "position",
      header: "Position",
      render: (member) => (
        <span className="text-sm text-muted-foreground">{member.position ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: "last_login",
      header: "Last sign-in",
      render: (member) => (
        <span className="text-sm text-muted-foreground">
          {member.last_login_at ? new Date(member.last_login_at).toLocaleString("en-GB") : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (member) => (
        <div className="flex justify-end gap-1">
          {can("user.edit") && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(member)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {can("user.delete") && member.id !== currentUser?.id && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(member)} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5 text-critical-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        search={search}
        onSearch={onSearchChange}
        searchPlaceholder="Search members…"
        activeFilters={list.filters}
        onFilterChange={(key, value) => list.setFilter(key, value)}
        onClear={list.reset}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: [
              { value: "active", label: t("status.active") },
              { value: "suspended", label: t("status.suspended") },
            ],
          },
          {
            key: "role_id",
            label: "Role",
            options: roles.map((role) => ({ value: String(role.id), label: role.name })),
          },
        ]}
      />

      {error && <ApiErrorBanner error={error} />}

      <div className="card">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(member) => member.id}
          loading={loading && items.length === 0}
          emptyTitle={t("table.empty")}
          emptyHint="Invite your team so everyone can sign in with their own role."
          caption={t("settings.members")}
        />
        {pageMeta && (
          <Pagination
            page={pageMeta.current_page}
            lastPage={pageMeta.last_page}
            total={pageMeta.total}
            onPageChange={(page) => list.set({ page })}
            label={t("table.page")}
          />
        )}
      </div>

      {creating && (
        <UserFormDialog
          roles={roles}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
            toast.success(t("form.saved"));
          }}
        />
      )}
      {editing && (
        <UserFormDialog
          key={editing.id}
          user={editing}
          roles={roles}
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
        title="Remove member"
        message={`Remove “${deleting?.name}”? They will lose access immediately. This cannot be undone.`}
        pending={remove.pending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.run(deleting.id);
            toast.success("Member removed");
            setDeleting(null);
            void refetch();
          } catch (caught) {
            toast.error((caught as ApiError).message);
          }
        }}
      />

      {can("user.create") && (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t("action.create")}
          </Button>
        </div>
      )}
    </div>
  );
}

function RolesContent({ payload, loading }: { payload: PermissionsPayload["data"] | undefined; loading: boolean }) {
  const { t } = useI18n();
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const roleSlugs = payload ? Object.keys(payload.roles) : [];
  const currentRole = activeRole && roleSlugs.includes(activeRole) ? activeRole : (roleSlugs[0] ?? "");
  const grantedList = payload?.role_permissions[currentRole] ?? [];
  const granted = new Set(grantedList);
  const groups = payload ? toGroups(payload.catalog) : [];

  if (loading && !payload) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={5} />
      </div>
    );
  }

  if (!payload || roleSlugs.length === 0) {
    return (
      <div className="card">
        <EmptyState title={t("table.empty")} hint="Role definitions are not available yet." />
      </div>
    );
  }

  return (
    <>
      <Tabs
        items={roleSlugs.map((slug) => ({
          id: slug,
          label: payload.roles[slug] ?? titleCase(slug),
          count: payload.role_permissions[slug]?.length ?? 0,
        }))}
        active={currentRole}
        onChange={(id) => setActiveRole(id)}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden />
          <h2 className="text-sm font-semibold">{payload.roles[currentRole] ?? titleCase(currentRole)}</h2>
          <span className="badge border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {grantedList.length} permissions
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Checked = allowed · dashed = not allowed</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const groupGranted = group.entries.filter((entry) => granted.has(entry.key)).length;
          return (
            <div key={group.label} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {groupGranted}/{group.entries.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {group.entries.map((entry) => {
                  const has = granted.has(entry.key);
                  return (
                    <li key={entry.key} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          has
                            ? "border-success-500/40 bg-success-50 text-success-600"
                            : "border-border bg-background text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {has ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-sm", has ? "text-foreground" : "text-muted-foreground")}>
                          {entry.name}
                        </span>
                        <span className="block break-all font-mono text-[0.65rem] text-muted-foreground">
                          {entry.key}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

function UsersContent() {
  const { t } = useI18n();
  const { can, user } = useAuth();
  const [tab, setTab] = useState("members");

  const { data, loading, error } = useResource<PermissionsPayload>("/meta/permissions");
  const payload = data?.data;

  if (!can("user.view")) {
    return (
      <div className="card">
        <EmptyState
          title={t("common.unauthorized")}
          hint="Only owners and managers can review members, roles and permissions."
          icon={<Lock className="h-8 w-8 text-muted-foreground" aria-hidden />}
        />
      </div>
    );
  }

  const memberCount = payload?.role_ids ? Object.keys(payload.role_ids).length : undefined;

  return (
    <div>
      <PageHeader
        title={t("nav.users")}
        subtitle="Manage who can sign in and what each role is allowed to do"
        actions={
          user?.role ? (
            <span className="badge border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              You are {user.role.name}
            </span>
          ) : undefined
        }
      />

      <Tabs
        items={[
          { id: "members", label: t("settings.members") },
          { id: "roles", label: t("settings.roles"), count: memberCount },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      <div className="card mb-5 flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Every member of your organization signs in with one of these roles — the roles tab shows exactly what each
          role can see and do. You can change a member&apos;s role at any time.
        </p>
      </div>

      {error && <ApiErrorBanner error={error} />}

      {tab === "members" ? (
        loading && !payload ? (
          <div className="grid gap-4">
            <CardSkeleton rows={3} />
            <CardSkeleton rows={5} />
          </div>
        ) : (
          <MembersContent meta={payload} />
        )
      ) : (
        <RolesContent payload={payload} loading={loading} />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>
      <UsersContent />
    </Suspense>
  );
}
