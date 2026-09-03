import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth-store";

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold text-stone-900">CoffeeShopSupplier</h1>
        <p className="mt-4 text-lg text-stone-600">
          The B2B marketplace connecting coffee shops with trusted suppliers.
        </p>
        {isAuthenticated && user ? (
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-stone-700">
              Welcome back, <span className="font-semibold">{user.businessName}</span>
            </p>
            <div className="flex gap-4">
              {user.role === "buyer" && (
                <Link
                  to="/buyer/products"
                  className="rounded-lg bg-amber-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-800"
                >
                  Browse catalog
                </Link>
              )}
              {user.role === "buyer" && (
                <Link
                  to="/buyer/orders"
                  className="rounded-lg border border-amber-700 px-6 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-700 hover:text-white"
                >
                  Your orders
                </Link>
              )}
              {user.role === "supplier" && (
                <Link
                  to="/supplier"
                  className="rounded-lg bg-amber-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-800"
                >
                  Your dashboard
                </Link>
              )}
              {user.role === "supplier" && (
                <Link
                  to="/supplier/orders"
                  className="rounded-lg border border-amber-700 px-6 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-700 hover:text-white"
                >
                  Incoming orders
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex gap-4">
            <Link
              to="/login"
              className="rounded-lg bg-amber-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-800"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-amber-700 px-6 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-700 hover:text-white"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
