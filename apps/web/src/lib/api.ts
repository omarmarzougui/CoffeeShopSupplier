import type { Role } from "@coffee/types";

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
const ACCESS_KEY = "access_token";
const USER_KEY = "auth_user";

let refreshPromise: Promise<RefreshResponse> | null = null;
let autoRefreshTimer: ReturnType<typeof setTimeout> | null = null;

// ── localStorage helpers ─────────────────────────────────────────────

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
  return localStorage.getItem(ACCESS_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(ACCESS_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_KEY);
}

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function storeUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function getUserFromStorage(): AuthUser | null {
  return getToken() && getStoredUser() ? getStoredUser() : null;
}

// ── JWT expiry helpers ───────────────────────────────────────────────

function decodeExp(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const data = JSON.parse(atob(payload)) as { exp?: number };
    return typeof data.exp === "number" ? data.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getAccessTokenExpiry(): number | null {
  const token = getToken();
  return token ? decodeExp(token) : null;
}

function isAccessTokenExpiringSoon(bufferMs = 60_000): boolean {
  const exp = getAccessTokenExpiry();
  if (exp === null) return true;
  return Date.now() >= exp - bufferMs;
}

// ── refresh logic ────────────────────────────────────────────────────

async function doRefresh(): Promise<RefreshResponse> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error("Refresh failed");

  return (await res.json()) as RefreshResponse;
}

export async function refreshAccessToken(): Promise<RefreshResponse> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function clearSession(): void {
  clearToken();
  clearRefreshToken();
  clearUser();
  cancelAutoRefresh();
}

// ── auto-refresh timer ───────────────────────────────────────────────

export function cancelAutoRefresh(): void {
  if (autoRefreshTimer !== null) {
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

export function scheduleAutoRefresh(): void {
  cancelAutoRefresh();
  const exp = getAccessTokenExpiry();
  if (exp === null) return;
  const msUntilRefresh = Math.max(exp - Date.now() - 60_000, 1_000);
  autoRefreshTimer = setTimeout(() => {
    void autoRefreshTick();
  }, msUntilRefresh);
}

async function autoRefreshTick(): Promise<void> {
  const rt = getStoredRefreshToken();
  if (!rt) return;
  if (!isAccessTokenExpiringSoon()) {
    scheduleAutoRefresh();
    return;
  }
  try {
    const tokens = await refreshAccessToken();
    storeToken(tokens.accessToken);
    storeRefreshToken(tokens.refreshToken);
    scheduleAutoRefresh();
  } catch {
    clearSession();
    window.dispatchEvent(new Event("auth:session-expired"));
  }
}

// ── initial session restore ──────────────────────────────────────────

export async function restoreSession(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  const user = getStoredUser();
  if (!refreshToken || !user) return false;

  if (getToken() && !isAccessTokenExpiringSoon()) {
    scheduleAutoRefresh();
    return true;
  }

  try {
    const tokens = await refreshAccessToken();
    storeToken(tokens.accessToken);
    storeRefreshToken(tokens.refreshToken);
    scheduleAutoRefresh();
    return true;
  } catch {
    clearSession();
    return false;
  }
}

// ── fetch wrapper ────────────────────────────────────────────────────

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
      scheduleAutoRefresh();

      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("Authorization", `Bearer ${tokens.accessToken}`);
      res = await fetch(url, { ...options, headers: retryHeaders });
    } catch {
      clearSession();
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
