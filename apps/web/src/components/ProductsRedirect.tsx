import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth-store";

export function ProductsRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role === "supplier") {
    return <Navigate to="/supplier/products" replace />;
  }
  if (user?.role === "admin") {
    return <Navigate to="/buyer/products" replace />;
  }
  return <Navigate to="/buyer/products" replace />;
}
