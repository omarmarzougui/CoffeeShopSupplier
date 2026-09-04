import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSupplierOrders } from "../lib/orders";
import { fetchProducts } from "../lib/catalog";
import { useAuthStore } from "../stores/auth-store";
import { Card, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { formatMinorUnits } from "@coffee/utils";

export function SupplierDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["supplier-orders", "dashboard"],
    queryFn: () => listSupplierOrders({}),
  });

  const { data: productsData } = useQuery({
    queryKey: ["supplier-products", "dashboard"],
    queryFn: () => (user?.id ? fetchProducts({ limit: 100, supplier: user.id }) : fetchProducts({ limit: 100 })),
    enabled: !!user?.id,
  });

  const orders = ordersData?.items ?? [];
  const pending = orders.filter((o) => o.status === "pending").length;
  const activeProducts = productsData?.items.filter((p) => !p.archived).length ?? 0;
  const outOfStock = productsData?.items.filter((p) => !p.stockAvailable && !p.archived).length ?? 0;
  const recent = orders.slice(0, 3);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Overview</h1>
        <p className="mt-1 text-sm text-stone-500">Fulfillment and catalog at a glance.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Pending orders"
          value={pending}
          hint={pending ? "Needs confirmation" : "All caught up"}
          tone={pending ? "warning" : "neutral"}
        />
        <Kpi label="Active products" value={activeProducts} hint={`${outOfStock} out of stock`} />
        <Kpi label="Total orders" value={orders.length} hint="All time" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Incoming orders"
            description={orders.length ? `${orders.length} total · newest first` : undefined}
            action={
              <Link to="/supplier/orders" className="text-xs font-medium text-stone-600 hover:text-stone-900">
                View all →
              </Link>
            }
          />
          <div className="mt-4">
            {ordersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recent.length === 0 ? (
              <div className="rounded-md border border-dashed border-stone-300 px-4 py-8 text-center">
                <p className="text-sm font-medium text-stone-700">No incoming orders</p>
                <p className="mt-1 text-xs text-stone-500">Orders from buyers will appear here.</p>
                <Link to="/supplier/products" className="mt-3 inline-flex">
                  <Button size="sm" variant="secondary">
                    Manage products
                  </Button>
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
                      <p className="mt-1 text-xs text-stone-500">
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
            <Link to="/supplier/orders" className="block">
              <Button className="w-full">View orders {pending ? `(${pending})` : ""}</Button>
            </Link>
            <Link to="/supplier/products" className="block">
              <Button variant="secondary" className="w-full">
                Manage products
              </Button>
            </Link>
          </div>
          <div className="mt-4 rounded-md bg-stone-50 px-3 py-2.5 text-xs leading-5 text-stone-600">
            Keep stock and lead times accurate — buyers see availability before ordering.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <Card className={`p-4 ${tone === "warning" && value > 0 ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{hint}</p>
    </Card>
  );
}
