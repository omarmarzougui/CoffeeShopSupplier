import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSupplier } from "../lib/catalog";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

export function SupplierProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => fetchSupplier(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-sm font-semibold text-stone-900">Supplier not found</h1>
        <p className="mt-1 text-sm text-stone-500">Check the link or return to catalog.</p>
        <Link
          to="/buyer/products"
          className="mt-4 inline-flex text-sm font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/buyer/products" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
        <span aria-hidden>←</span> Back to catalog
      </Link>

      <Card>
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white"
            aria-hidden
          >
            {supplier.businessName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-stone-900">{supplier.businessName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={supplier.verified ? "success" : "neutral"}>
                {supplier.verified ? "Verified" : "Unverified"}
              </Badge>
              <span className="text-xs text-stone-500">
                {supplier.productCount} product{supplier.productCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        {(supplier.address || supplier.phone) && (
          <dl className="mt-6 grid gap-3 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
            {supplier.address && (
              <div className="flex gap-2">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-stone-500">Address</dt>
                <dd className="text-stone-700">{supplier.address}</dd>
              </div>
            )}
            {supplier.phone && (
              <div className="flex gap-2">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-stone-500">Phone</dt>
                <dd className="text-stone-700">{supplier.phone}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-6">
          <Link to={`/buyer/products?supplier=${supplier.id}`}>
            <Button>View products from this supplier</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
