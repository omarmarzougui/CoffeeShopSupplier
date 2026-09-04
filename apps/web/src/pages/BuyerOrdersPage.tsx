import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import { listBuyerOrders, cancelOrder, reorderOrder, type Order, type OrderStatus } from "../lib/orders";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/empty-state";

export function BuyerOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["buyer-orders", status],
    queryFn: () => listBuyerOrders(status ? { status } : {}),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["buyer-orders"] }),
  });

  const reorderMut = useMutation({
    mutationFn: (id: string) => reorderOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["buyer-orders"] }),
  });

  return (
    <div>
      <PageHeader
        title="My orders"
        description="Track status, cancel pending orders or reorder quickly."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="buyer-status" className="text-xs font-medium text-stone-600">
          Status
        </label>
        <Select
          id="buyer-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
          className="w-44"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        {(cancelMut.error || reorderMut.error) && (
          <span className="text-xs text-red-600">
            {(cancelMut.error as Error)?.message ?? (reorderMut.error as Error)?.message}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="error">Failed to load orders — please try again.</Alert>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            status
              ? `No orders with status “${status}”. Try a different filter.`
              : "Orders you place will appear here. Start from the catalog."
          }
          action={!status ? { label: "Browse catalog", to: "/buyer/products" } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={(id) => cancelMut.mutate(id)}
              onReorder={(id) => reorderMut.mutate(id)}
              cancelling={cancelMut.isPending}
              reordering={reorderMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onCancel,
  onReorder,
  cancelling,
  reordering,
}: {
  order: Order;
  onCancel: (id: string) => void;
  onReorder: (id: string) => void;
  cancelling: boolean;
  reordering: boolean;
}) {
  const cancellable = order.status === "pending" || order.status === "confirmed";

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-stone-500" title={order.id}>
            #{order.id.slice(0, 8)}
          </span>
          <StatusBadge status={order.status} />
          <span className="text-xs text-stone-400">
            {new Date(order.createdAt).toLocaleDateString()}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-stone-900">
          {formatMinorUnits(order.totalAmount, order.currency)}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-stone-100 rounded-md border border-stone-100">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium text-stone-800">{item.product.name}</span>
              <span className="ml-2 text-xs tabular-nums text-stone-500">
                {item.quantity} × {formatMinorUnits(item.unitPrice, order.currency)}
              </span>
            </div>
            <span className="shrink-0 tabular-nums text-stone-700">
              {formatMinorUnits(item.subtotal, order.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {cancellable && (
          <Button variant="danger" size="sm" onClick={() => onCancel(order.id)} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel"}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => onReorder(order.id)} disabled={reordering}>
          {reordering ? "Reordering…" : "Reorder"}
        </Button>
      </div>
    </Card>
  );
}
