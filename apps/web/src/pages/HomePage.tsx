import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth-store";
import { Button } from "../components/ui/button";

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-sm font-semibold tracking-tight text-stone-900">
            CoffeeShopSupplier
          </span>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <span className="text-xs text-stone-500">{user?.email}</span>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            B2B marketplace for coffee shops &amp; suppliers
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Procurement, simplified.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">
            Browse verified suppliers, compare prices, place orders and track
            deliveries — all in one professional workspace built for daily operations.
          </p>

          {isAuthenticated && user ? (
            <div className="mt-8">
              <p className="text-sm text-stone-600">
                Welcome back, <span className="font-medium text-stone-900">{user.businessName}</span>
                <span className="ml-2 text-xs text-stone-500">· {user.role}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {user.role === "buyer" && (
                  <>
                    <Link to="/buyer/products">
                      <Button>Browse catalog</Button>
                    </Link>
                    <Link to="/buyer/orders">
                      <Button variant="secondary">View orders</Button>
                    </Link>
                  </>
                )}
                {user.role === "supplier" && (
                  <>
                    <Link to="/supplier">
                      <Button>Open dashboard</Button>
                    </Link>
                    <Link to="/supplier/orders">
                      <Button variant="secondary">Incoming orders</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button>Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Create account</Button>
              </Link>
            </div>
          )}

          <div className="mt-12 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                For buyers
              </h3>
              <p className="mt-1 text-sm text-stone-600">Search, compare and reorder in seconds.</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                For suppliers
              </h3>
              <p className="mt-1 text-sm text-stone-600">Manage catalog and fulfill orders faster.</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Trusted
              </h3>
              <p className="mt-1 text-sm text-stone-600">Clear pricing, order history and invoices.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
