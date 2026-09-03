import type { Role } from "@coffee/types";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  businessName: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const REFRESH_KEY = "refresh_token";

let refreshPromise: Promise<AuthTokens> | null = null;

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export function storeToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("access_token");
}

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("auth_user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function storeUser(user: AuthUser): void {
  localStorage.setItem("auth_user", JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem("auth_user");
}

async function doRefresh(): Promise<AuthTokens> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearRefreshToken();
    clearToken();
    clearUser();
    throw new Error("Refresh failed");
  }

  return (await res.json()) as RefreshResponse;
}

export async function refreshAccessToken(): Promise<AuthTokens> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function getUserFromStorage(): AuthUser | null {
  const token = getToken();
  const user = getStoredUser();
  return token && user ? user : null;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && getStoredRefreshToken()) {
    try {
      const tokens = await refreshAccessToken();
      storeToken(tokens.accessToken);
      storeRefreshToken(tokens.refreshToken);

      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("Authorization", `Bearer ${tokens.accessToken}`);
      res = await fetch(url, { ...options, headers: retryHeaders });
    } catch {
      clearRefreshToken();
      clearToken();
      clearUser();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
    );
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { status?: number; body?: unknown }).body = body;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
