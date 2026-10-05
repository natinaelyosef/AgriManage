"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient, type Paginated } from "@/lib/api/client";

interface ResourceState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export interface ResourceResult<T> extends ResourceState<T> {
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Fetches `path` whenever it (or the query) changes. `path: null` skips fetching.
 */
export function useResource<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | undefined | null>,
): ResourceResult<T> {
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: path !== null });
  const key = JSON.stringify([path, query ?? {}]);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  });

  const load = useCallback(async () => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiClient.get<T>(path, queryRef.current);
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((prev) => ({
        data: prev.data,
        error: error instanceof ApiError ? error : new ApiError(String(error), 0),
        loading: false,
      }));
    }
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    apiClient
      .get<T>(path, query)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((prev) => ({
            data: prev.data,
            error: error instanceof ApiError ? error : new ApiError(String(error), 0),
            loading: false,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path]);

  const setData = useCallback((updater: React.SetStateAction<T | null>) => {
    setState((prev) => ({ ...prev, data: typeof updater === "function" ? (updater as (p: T | null) => T | null)(prev.data) : updater }));
  }, []);

  return { ...state, refetch: load, setData };
}

/** Convenience wrapper for Laravel paginated index endpoints. */
export function usePaginated<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | undefined | null>,
): ResourceResult<Paginated<T>> & { items: T[]; meta: Paginated<T>["meta"] | null } {
  const result = useResource<Paginated<T>>(path, query);
  return { ...result, items: result.data?.data ?? [], meta: result.data?.meta ?? null };
}

interface MutationState {
  pending: boolean;
  error: ApiError | null;
}

export interface MutationResult<TInput, TOutput> extends MutationState {
  run: (input: TInput) => Promise<TOutput>;
  reset: () => void;
}

/**
 * Wraps a single API mutation with pending/error bookkeeping.
 * Usage: const save = useMutation((body: FarmInput) => apiClient.post("/farms", body));
 */
export function useMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>,
): MutationResult<TInput, TOutput> {
  const [state, setState] = useState<MutationState>({ pending: false, error: null });
  const mounted = useRef(true);
  const mutatorRef = useRef(mutator);

  useEffect(() => {
    mutatorRef.current = mutator;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (input: TInput): Promise<TOutput> => {
    setState({ pending: true, error: null });
    try {
      const output = await mutatorRef.current(input);
      if (mounted.current) setState({ pending: false, error: null });
      return output;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(String(error), 0);
      if (mounted.current) setState({ pending: false, error: apiError });
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => setState({ pending: false, error: null }), []);

  return { ...state, run, reset };
}
