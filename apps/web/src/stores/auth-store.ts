import { create } from "zustand";
import type { Role } from "@coffee/types";
import {
  clearRefreshToken,
  clearToken,
  clearUser,
  getStoredRefreshToken,
  getUserFromStorage,
  storeRefreshToken,
  storeToken,
  storeUser,
  refreshAccessToken,
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
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login(user, accessToken, refreshToken) {
    storeToken(accessToken);
    storeRefreshToken(refreshToken);
    storeUser(user);
    set({ user, isAuthenticated: true });
  },

  logout() {
    clearToken();
    clearRefreshToken();
    clearUser();
    set({ user: null, isAuthenticated: false });
  },

  async refresh() {
    try {
      const tokens = await refreshAccessToken();
      storeToken(tokens.accessToken);
      storeRefreshToken(tokens.refreshToken);
    } catch {
      clearToken();
      clearRefreshToken();
      clearUser();
      set({ user: null, isAuthenticated: false });
    }
  },

  initialize() {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    const user = getUserFromStorage();
    if (user) {
      set({ user, isAuthenticated: true });
    }
  },
}));
