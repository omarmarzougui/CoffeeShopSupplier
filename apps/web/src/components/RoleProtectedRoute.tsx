import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@coffee/types";
import { useAuthStore } from "../stores/auth-store";

export function RoleProtectedRoute({ roles }: { roles: Role[] }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReady = useAuthStore((s) => s.isReady);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50" role="status" aria-live="polite" aria-busy="true">
        <div className="text-sm text-stone-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={user?.role === "supplier" ? "/supplier" : "/buyer"} replace />;
  }

  return <Outlet />;
}
