"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface ListQuery {
  q: string;
  page: number;
  sort: string;
  perPage: number;
  filters: Record<string, string>;
}

export interface ListQueryResult extends ListQuery {
  /** Query params ready for index endpoints (q, sort, page, per_page + filters). */
  params: Record<string, string | number | undefined>;
  set: (patch: Partial<Omit<ListQuery, "filters">> & { filters?: Record<string, string> }) => void;
  setFilter: (key: string, value: string | null) => void;
  reset: () => void;
}

const RESERVED = ["q", "page", "sort", "per_page"];

/**
 * URL-backed list state (search, sort, pagination, filters) so views are
 * shareable and survive reloads. Read via useSearchParams — wrap the calling
 * component in <Suspense>.
 */
export function useListQuery(defaults?: { sort?: string; perPage?: number; filters?: string[] }): ListQueryResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const sort = searchParams.get("sort") ?? defaults?.sort ?? "-created_at";
  const perPage = Math.min(100, Math.max(5, Number(searchParams.get("per_page") ?? defaults?.perPage ?? 15) || 15));

  const filterKeys = useMemo(() => {
    const keys = new Set<string>(defaults?.filters ?? []);
    searchParams.forEach((value, key) => {
      if (!RESERVED.includes(key)) keys.add(key);
    });
    return keys;
  }, [defaults?.filters, searchParams]);

  const filters: Record<string, string> = {};
  filterKeys.forEach((key) => {
    const value = searchParams.get(key);
    if (value) filters[key] = value;
  });

  const commit = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const set = useCallback<ListQueryResult["set"]>(
    (patch) => {
      const next = new URLSearchParams(searchParams.toString());
      if ("q" in patch) {
        if (patch.q) next.set("q", patch.q);
        else next.delete("q");
      }
      if ("page" in patch) {
        if (patch.page && patch.page > 1) next.set("page", String(patch.page));
        else next.delete("page");
      }
      if ("sort" in patch) {
        if (patch.sort) next.set("sort", patch.sort);
        else next.delete("sort");
      }
      if ("perPage" in patch && patch.perPage) next.set("per_page", String(patch.perPage));
      if (patch.filters) {
        Object.entries(patch.filters).forEach(([key, value]) => {
          if (value) next.set(key, value);
          else next.delete(key);
        });
      }
      commit(next);
    },
    [commit, searchParams],
  );

  const setFilter = useCallback<ListQueryResult["setFilter"]>(
    (key, value) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      commit(next);
    },
    [commit, searchParams],
  );

  const reset = useCallback(() => commit(new URLSearchParams()), [commit]);

  return {
    q,
    page,
    sort,
    perPage,
    filters,
    params: {
      q: q || undefined,
      page: page > 1 ? page : undefined,
      sort,
      per_page: perPage,
      ...filters,
    },
    set,
    setFilter,
    reset,
  };
}
