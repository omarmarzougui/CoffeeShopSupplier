import { useState } from "react";
import { Link } from "react-router-dom";
import { formatMinorUnits } from "@coffee/utils";
import { apiFetch } from "../lib/api";
import { useCartStore, groupCartItems, cartTotal, cartItemCount } from "../stores/cart-store";
import { PageHeader } from "../components/ui/page-header";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { QuantityStepper } from "../components/ui/quantity-stepper";
import { EmptyState } from "../components/ui/empty-state";

interface OrderResponse {
  orders: { id: string; supplierId: string; totalAmount: number; currency: string }[];
}

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderResponse | null>(null);

  const handleCheckout = async () => {
    setPlacing(true);
    setError(null);
    try {
      const res = await apiFetch<OrderResponse>("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      setPlaced(res);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0 && !placed) {
    return (
      <div>
        <PageHeader title="Cart" description="Review items before placing your orders." />
        <EmptyState
          title="Your cart is empty"
          description="Add products from the catalog. Items are grouped by supplier at checkout."
          action={{ label: "Browse products", to: "/buyer/products" }}
        />
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Order placed" description="Your orders have been sent to suppliers." />
        <Card>
          <p className="text-sm font-medium text-stone-900">Success — {placed.orders.length} order{placed.orders.length === 1 ? "" : "s"} created.</p>
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            {placed.orders.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span className="font-mono text-xs text-stone-500">#{o.id.slice(0, 8)}</span>
                <span className="font-medium tabular-nums">{formatMinorUnits(o.totalAmount, o.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-3">
            <Link to="/buyer/orders">
              <Button>View orders</Button>
            </Link>
            <Link to="/buyer/products">
              <Button variant="secondary">Continue shopping</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const groups = groupCartItems(items);
  const totals = cartTotal(items);
  const count = cartItemCount(items);
  const hasBlockingIssue = groups.some((g) => g.hasBelowMoq || g.items.some((i) => !i.stockAvailable));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Cart"
        description={`${count} item${count === 1 ? "" : "s"} across ${groups.length} supplier${groups.length === 1 ? "" : "s"} · orders are placed per supplier.`}
        action={
          <Button variant="ghost" onClick={clear} size="sm">
            Clear cart
          </Button>
        }
      />

      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.supplierId} className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">{group.supplierName}</h2>
                <p className="text-xs text-stone-500">
                  {group.items.length} item{group.items.length === 1 ? "" : "s"} · Subtotal{" "}
                  <span className="font-medium tabular-nums text-stone-900">
                    {formatMinorUnits(group.subtotal, group.currency)}
                  </span>
                </p>
              </div>
              <Link
                to={`/buyer/suppliers/${group.supplierId}`}
                className="text-xs font-medium text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900 hover:decoration-stone-900"
              >
                View supplier
              </Link>
            </div>

            {group.hasBelowMoq && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                Some items are below the minimum order quantity — adjust quantities before checkout.
              </div>
            )}

            <ul className="divide-y divide-stone-100">
              {group.items.map((item) => (
                <li key={item.productId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/buyer/products/${item.productId}`}
                      className="text-sm font-medium text-stone-900 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {item.sku} · {formatMinorUnits(item.price, item.currency)} / {item.unit}
                    </p>
                    {item.quantity < item.minOrderQty && (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        MOQ {item.minOrderQty} {item.unit} minimum
                      </p>
                    )}
                    {!item.stockAvailable && (
                      <p className="mt-1 text-xs font-medium text-red-600">Out of stock</p>
                    )}
                  </div>

                  <QuantityStepper
                    value={item.quantity}
                    onChange={(v) => updateQty(item.productId, v)}
                    min={0}
                    ariaLabel={`Quantity for ${item.name}`}
                    size="sm"
                  />

                  <div className="w-24 text-right text-sm font-semibold tabular-nums text-stone-900">
                    {formatMinorUnits(item.price * item.quantity, item.currency)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-xs font-medium text-stone-500 hover:text-red-600"
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="space-y-2">
          {Object.entries(totals).map(([currency, total]) => (
            <div key={currency} className="flex items-center justify-between">
              <span className="text-sm text-stone-600">Total ({currency})</span>
              <span className="text-base font-semibold tabular-nums text-stone-900">
                {formatMinorUnits(total, currency)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          One order will be created per supplier. Prices are validated at checkout.
        </p>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {hasBlockingIssue && (
          <div className="mt-4">
            <Alert variant="warning">
              Fix quantities below MOQ or remove out-of-stock items before checkout. The server will reject invalid orders.
            </Alert>
          </div>
        )}

        <Button onClick={handleCheckout} disabled={placing} className="mt-4 w-full" size="lg">
          {placing ? "Placing order…" : "Place order"}
        </Button>
      </Card>
    </div>
  );
}
