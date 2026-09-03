import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuthStore } from "../stores/auth-store";
import type { AuthResponse } from "./api";
import { apiFetch, clearSession } from "./api";

interface AuthContextValue {
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  role: "buyer" | "supplier";
  businessName: string;
  phone?: string;
  address?: string;
  vatId?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const storeLogin = useAuthStore((s) => s.login);
  const storeLogout = useAuthStore((s) => s.logout);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();

    const onExpired = () => {
      clearSession();
      storeLogout();
    };
    window.addEventListener("auth:session-expired", onExpired);
    return () => window.removeEventListener("auth:session-expired", onExpired);
  }, [initialize, storeLogout]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    storeLogin(data.user, data.accessToken, data.refreshToken);
    return data;
  };

  const register = async (body: RegisterData): Promise<AuthResponse> => {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    storeLogin(data.user, data.accessToken, data.refreshToken);
    return data;
  };

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem("refresh_token");
    try {
      if (refreshToken) {
        await apiFetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearSession();
      storeLogout();
    }
  };

  return (
    <AuthContext.Provider value={{ login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
