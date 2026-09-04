import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listBuyerOrders } from "../lib/orders";
import { Card, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { formatMinorUnits } from "@coffee/utils";

export function BuyerDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["buyer-orders", "dashboard"],
    queryFn: () => listBuyerOrders({}),
  });

  const orders = data?.items ?? [];
  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    dispatched: orders.filter((o) => o.status === "dispatched").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };
  const recent = orders.slice(0, 3);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Overview</h1>
        <p className="mt-1 text-sm text-stone-500">
          What needs your attention right now.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending" value={counts.pending} hint="Awaiting supplier" />
        <Kpi label="Confirmed" value={counts.confirmed} hint="In preparation" />
        <Kpi label="Dispatched" value={counts.dispatched} hint="On the way" />
        <Kpi label="Delivered" value={counts.delivered} hint="Completed" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent orders"
            description={orders.length ? `${orders.length} total · newest first` : undefined}
            action={
              <Link to="/buyer/orders" className="text-xs font-medium text-stone-600 hover:text-stone-900">
                View all →
              </Link>
            }
          />
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recent.length === 0 ? (
              <div className="rounded-md border border-dashed border-stone-300 px-4 py-8 text-center">
                <p className="text-sm font-medium text-stone-700">No orders yet</p>
                <p className="mt-1 text-xs text-stone-500">Orders you create will appear here.</p>
                <Link to="/buyer/products" className="mt-3 inline-flex">
                  <Button size="sm">Browse catalog</Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
                {recent.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-stone-500">#{o.id.slice(0, 8)}</span>
                      <span className="ml-2">
                        <StatusBadge status={o.status} />
                      </span>
                      <p className="mt-1 truncate text-xs text-stone-500">
                        {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900">
                      {formatMinorUnits(o.totalAmount, o.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="mt-4 space-y-2">
            <Link to="/buyer/products" className="block">
              <Button className="w-full">Browse catalog</Button>
            </Link>
            <Link to="/buyer/orders" className="block">
              <Button variant="secondary" className="w-full">
                My orders
              </Button>
            </Link>
            <Link to="/buyer/cart" className="block">
              <Button variant="ghost" className="w-full">
                View cart
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            Tip: add products to cart grouped by supplier — orders are placed per supplier and prices are validated at checkout.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{hint}</p>
    </Card>
  );
}
