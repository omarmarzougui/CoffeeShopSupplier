import { Link } from "react-router-dom";
import { formatMinorUnits } from "@coffee/utils";
import { useCartStore, groupCartItems, cartTotal, cartItemCount } from "../stores/cart-store";

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-stone-500">Your cart is empty.</p>
        <Link to="/buyer/products" className="text-amber-700 underline">
          Browse products
        </Link>
      </div>
    );
  }

  const groups = groupCartItems(items);
  const totals = cartTotal(items);
  const count = cartItemCount(items);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Your Cart</h1>
        <button
          onClick={clear}
          className="text-sm text-red-600 hover:underline"
        >
          Clear cart
        </button>
      </div>

      <div className="mb-4 text-sm text-stone-500">
        {count} item{count === 1 ? "" : "s"} across {groups.length} supplier
        {groups.length === 1 ? "" : "s"}
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section
            key={group.supplierId}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
          >
            <header className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-5 py-3">
              <div>
                <h2 className="font-semibold text-stone-800">{group.supplierName}</h2>
                {group.hasBelowMoq && (
                  <p className="text-xs text-red-600">
                    Some items below the minimum order quantity
                  </p>
                )}
              </div>
              <Link
                to={`/buyer/suppliers/${group.supplierId}`}
                className="text-sm text-amber-700 hover:underline"
              >
                View supplier
              </Link>
            </header>

            <ul className="divide-y divide-stone-100">
              {group.items.map((item) => (
                <li key={item.productId} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/buyer/products/${item.productId}`}
                      className="font-medium text-stone-800 hover:text-amber-700"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {item.sku} · {formatMinorUnits(item.price, item.currency)} / {item.unit}
                    </p>
                    {item.quantity < item.minOrderQty && (
                      <p className="mt-1 text-xs text-red-600">
                        MOQ {item.minOrderQty} {item.unit} minimum
                      </p>
                    )}
                    {!item.stockAvailable && (
                      <p className="mt-1 text-xs text-red-600">Out of stock</p>
                    )}
                  </div>

                  <div className="flex items-center rounded-lg border border-stone-300">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="px-3 py-1.5 text-stone-500 hover:text-stone-900"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQty(item.productId, Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-14 border-x border-stone-300 py-1.5 text-center text-sm focus:outline-none"
                      aria-label={`Quantity for ${item.name}`}
                    />
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="px-3 py-1.5 text-stone-500 hover:text-stone-900"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-24 text-right font-semibold text-stone-800">
                    {formatMinorUnits(item.price * item.quantity, item.currency)}
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-sm text-red-600 hover:underline"
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <footer className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-5 py-3">
              <span className="text-sm font-medium text-stone-600">Subtotal</span>
              <span className="font-bold text-amber-700">
                {formatMinorUnits(group.subtotal, group.currency)}
              </span>
            </footer>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="space-y-2">
          {Object.entries(totals).map(([currency, total]) => (
            <div key={currency} className="flex items-center justify-between">
              <span className="text-sm text-stone-600">Total ({currency})</span>
              <span className="text-lg font-bold text-stone-900">
                {formatMinorUnits(total, currency)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Orders are placed and fulfilled per supplier.
        </p>
        <button className="mt-4 w-full rounded-lg bg-amber-700 py-3 font-semibold text-white transition-colors hover:bg-amber-800">
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}
