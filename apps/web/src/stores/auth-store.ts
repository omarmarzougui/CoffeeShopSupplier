import { create } from "zustand";
import type { Role } from "@coffee/types";
import {
  clearSession,
  getStoredRefreshToken,
  getUserFromStorage,
  refreshAccessToken,
  restoreSession,
  scheduleAutoRefresh,
  storeRefreshToken,
  storeToken,
  storeUser,
} from "../lib/api";

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  businessName: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isReady: false,

  login(user, accessToken, refreshToken) {
    storeToken(accessToken);
    storeRefreshToken(refreshToken);
    storeUser(user);
    set({ user, isAuthenticated: true });
    scheduleAutoRefresh();
  },

  async logout() {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearSession();
      set({ user: null, isAuthenticated: false });
    }
  },

  async refresh() {
    try {
      const tokens = await refreshAccessToken();
      storeToken(tokens.accessToken);
      storeRefreshToken(tokens.refreshToken);
      scheduleAutoRefresh();
    } catch {
      clearSession();
      set({ user: null, isAuthenticated: false });
    }
  },

  async initialize() {
    if (get().isReady) return;

    const ok = await restoreSession();

    if (ok) {
      const user = getUserFromStorage();
      if (user) {
        set({ user, isAuthenticated: true, isReady: true });
        return;
      }
    }

    clearSession();
    set({ user: null, isAuthenticated: false, isReady: true });
  },
}));
