import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSupplier } from "../lib/catalog";

export function SupplierProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => fetchSupplier(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <p className="py-8 text-center text-stone-400">Loading supplier...</p>;
  }

  if (error || !supplier) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-stone-500">Supplier not found.</p>
        <Link to="/buyer/products" className="text-amber-700 underline">
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/buyer/products" className="mb-4 inline-block text-sm text-amber-700 underline">
        ← Back to catalog
      </Link>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center gap-4 bg-stone-50 p-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-700 text-2xl text-white"
            aria-hidden
          >
            {supplier.businessName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{supplier.businessName}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                {supplier.verified ? "Verified" : "Unverified"}
              </span>
              <span className="text-sm text-stone-500">
                {supplier.productCount} product{supplier.productCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6 text-sm">
          {supplier.address && (
            <div>
              <span className="font-medium text-stone-700">Address:</span>{" "}
              <span className="text-stone-600">{supplier.address}</span>
            </div>
          )}
          {supplier.phone && (
            <div>
              <span className="font-medium text-stone-700">Phone:</span>{" "}
              <span className="text-stone-600">{supplier.phone}</span>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 p-6">
          <Link
            to={`/buyer/products?supplier=${supplier.id}`}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800"
          >
            View all products
          </Link>
        </div>
      </div>
    </div>
  );
}
