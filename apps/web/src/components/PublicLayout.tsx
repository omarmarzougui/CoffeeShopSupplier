import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-800">CoffeeShopSupplier</h1>
          <p className="mt-1 text-sm text-stone-500">B2B Marketplace for Coffee Shops</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
