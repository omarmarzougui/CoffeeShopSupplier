import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@coffee/types";
import { useAuthStore } from "../stores/auth-store";

export function RoleProtectedRoute({ roles }: { roles: Role[] }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={user?.role === "supplier" ? "/supplier" : "/buyer"} replace />;
  }

  return <Outlet />;
}
