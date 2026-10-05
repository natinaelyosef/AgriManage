"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, getToken, setToken } from "@/lib/api/client";
import type { AuthSession, AuthUser } from "@/lib/api/types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
}

export interface RegisterPayload {
  organization: { name: string; type: string; region?: string; phone?: string };
  user: { name: string; email: string; password: string; password_confirmation: string; phone?: string };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(() => getToken() !== null);

  const loadMe = useCallback(async () => {
    const current = getToken();
    if (!current) {
      setUser(null);
      setTokenState(null);
      setLoading(false);
      return;
    }

    setTokenState(current);

    try {
      const response = await apiClient.get<{ data: AuthUser }>("/auth/me");
      setUser(response.data);
    } catch {
      setToken(null);
      setUser(null);
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    apiClient
      .get<{ data: AuthUser }>("/auth/me")
      .then((response) => {
        if (!cancelled) setUser(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setTokenState(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<{ data: AuthSession }>("/auth/login", { email, password });
    setToken(response.data.token);
    setTokenState(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await apiClient.post<{ data: AuthSession }>("/auth/register", payload);
    setToken(response.data.token);
    setTokenState(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Token may already be invalid — clearing locally is what matters.
    }
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const permissions = useMemo(() => new Set(user?.permissions ?? []), [user]);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.role?.slug === "owner") return true;
      if (permission.endsWith(".*")) {
        const prefix = permission.slice(0, -1);
        for (const key of permissions) {
          if (key.startsWith(prefix)) return true;
        }
        return false;
      }
      return permissions.has(permission);
    },
    [permissions, user],
  );

  const canAny = useCallback(
    (list: string[]) => list.some((permission) => can(permission)),
    [can],
  );

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refresh: loadMe,
    can,
    canAny,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
