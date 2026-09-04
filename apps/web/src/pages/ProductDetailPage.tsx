import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import { fetchProduct } from "../lib/catalog";
import { useCartStore } from "../stores/cart-store";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { QuantityStepper } from "../components/ui/quantity-stepper";
import { Skeleton } from "../components/ui/skeleton";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [qty, setQty] = useState(0);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="text-sm font-semibold text-stone-900">Product not found</h1>
        <p className="mt-1 text-sm text-stone-500">It may have been archived or removed.</p>
        <Link
          to="/buyer/products"
          className="mt-4 inline-flex text-sm font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  const belowMoq = qty > 0 && qty < product.minOrderQty;
  const canAdd = product.stockAvailable && !belowMoq && qty > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/buyer/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
      >
        <span aria-hidden>←</span> Back to catalog
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-stone-900">{product.name}</h1>
              <p className="mt-1 text-xs text-stone-500">
                SKU {product.sku} · per {product.unit} · MOQ {product.minOrderQty}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-stone-900">
                {formatMinorUnits(product.price, product.currency)}
              </p>
              <p className="text-xs text-stone-500">per {product.unit}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {product.description && (
            <p className="text-sm leading-6 text-stone-700">{product.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-4 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Lead time</dt>
              <dd className="mt-1 font-medium text-stone-900">
                {product.leadTimeDays} day{product.leadTimeDays === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Availability</dt>
              <dd className="mt-1">
                {product.stockAvailable ? (
                  <Badge variant="success" dot>
                    In stock
                  </Badge>
                ) : (
                  <Badge variant="danger">Out of stock</Badge>
                )}
              </dd>
            </div>
          </dl>

          {product.supplier && (
            <div className="flex items-center justify-between rounded-md border border-stone-200 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Supplier</p>
                <p className="mt-1 text-sm font-medium text-stone-900">{product.supplier.businessName}</p>
              </div>
              <Link
                to={`/buyer/suppliers/${product.supplier.id}`}
                className="text-sm font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
              >
                View profile
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-5">
            <QuantityStepper value={qty} onChange={setQty} min={0} ariaLabel="Quantity" />
            <Button
              onClick={() => {
                if (!product.supplier) return;
                addItem(
                  {
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    unit: product.unit,
                    price: product.price,
                    currency: product.currency,
                    minOrderQty: product.minOrderQty,
                    stockAvailable: product.stockAvailable,
                    supplierId: product.supplier.id,
                    supplierName: product.supplier.businessName,
                  },
                  qty,
                );
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
              }}
              disabled={!canAdd || !product.stockAvailable}
            >
              {added ? "Added ✓" : "Add to cart"}
            </Button>

            {product.stockAvailable && (
              <Link
                to="/buyer/cart"
                className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900 hover:decoration-stone-900"
              >
                View cart
              </Link>
            )}
          </div>

          {belowMoq && (
            <Alert variant="warning">
              Minimum order is {product.minOrderQty} {product.unit}. Increase quantity to add to cart.
            </Alert>
          )}
          {!product.stockAvailable && <Alert variant="error">This product is currently out of stock.</Alert>}
          {qty === 0 && product.stockAvailable && (
            <p className="text-xs text-stone-500">Select a quantity to add to cart.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
