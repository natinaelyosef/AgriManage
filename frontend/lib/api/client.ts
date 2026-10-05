const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "agrimanage.token";

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; unread?: number };
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; query?: Record<string, string | number | boolean | undefined | null> };

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;
  const token = getToken();

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    setToken(null);
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const record = (payload ?? {}) as { message?: string; errors?: Record<string, string[]> };
    throw new ApiError(record.message ?? `Request failed (${response.status})`, response.status, record.errors);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"], init?: RequestOptions) =>
    api<T>(path, { ...init, method: "GET", query }),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    api<T>(path, { ...init, method: "POST", body }),
  put: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    api<T>(path, { ...init, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    api<T>(path, { ...init, method: "PATCH", body }),
  delete: <T>(path: string, init?: RequestOptions) => api<T>(path, { ...init, method: "DELETE" }),
};
