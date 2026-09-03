import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import { fetchProduct } from "../lib/catalog";
import { useCartStore } from "../stores/cart-store";

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
    return <p className="py-8 text-center text-stone-400">Loading...</p>;
  }

  if (error || !product) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-stone-500">Product not found.</p>
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
        <div className="flex h-56 items-center justify-center bg-stone-100 text-6xl" aria-hidden>
          ☕
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">{product.name}</h1>
              <p className="mt-1 text-sm text-stone-500">
                SKU: {product.sku} · per {product.unit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-700">
                {formatMinorUnits(product.price, product.currency)}
              </p>
              <p className="text-xs text-stone-500">MOQ {product.minOrderQty} {product.unit}</p>
            </div>
          </div>

          {product.description && (
            <p className="mt-4 text-stone-700">{product.description}</p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-stone-100 pt-4 text-sm">
            <div>
              <span className="text-stone-500">Lead time:</span>{" "}
              <span className="font-medium text-stone-800">
                {product.leadTimeDays} day{product.leadTimeDays === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Availability:</span>{" "}
              <span
                className={`font-medium ${product.stockAvailable ? "text-green-700" : "text-red-600"}`}
              >
                {product.stockAvailable ? "In stock" : "Out of stock"}
              </span>
            </div>
          </div>

          {product.supplier && (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <Link
                to={`/buyer/suppliers/${product.supplier.id}`}
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                View {product.supplier.businessName} →
              </Link>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
            <div className="flex items-center rounded-lg border border-stone-300">
              <button
                onClick={() => setQty((q) => Math.max(0, q - 1))}
                className="px-3 py-2 text-lg text-stone-500 hover:text-stone-900"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 border-x border-stone-300 py-2 text-center text-sm focus:outline-none"
                aria-label="Quantity"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-2 text-lg text-stone-500 hover:text-stone-900"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={() => {
                if (product.supplier) {
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
                }
              }}
              disabled={!product.stockAvailable || (qty > 0 && qty < product.minOrderQty)}
              className="rounded-lg bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {added ? "Added ✓" : "Add to cart"}
            </button>
            {qty > 0 && qty < product.minOrderQty && (
              <span className="text-xs text-red-600">
                MOQ is {product.minOrderQty} {product.unit}
              </span>
            )}
            {product.stockAvailable && (
              <Link
                to="/buyer/cart"
                className="ml-auto text-sm font-medium text-amber-700 underline"
              >
                View cart →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
