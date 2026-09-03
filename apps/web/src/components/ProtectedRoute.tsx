import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth-store";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReady = useAuthStore((s) => s.isReady);
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
