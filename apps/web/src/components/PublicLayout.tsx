import { Link, Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-sm font-semibold tracking-tight text-stone-900">
            CoffeeShopSupplier
          </Link>
          <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
            B2B Marketplace
          </span>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md items-center justify-center px-4 py-10">
        <div className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              CoffeeShopSupplier
            </h1>
            <p className="mt-1 text-sm text-stone-500">Sign in to your workspace</p>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
