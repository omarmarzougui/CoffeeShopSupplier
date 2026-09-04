import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import {
  listSupplierOrders,
  confirmOrder,
  dispatchOrder,
  deliverOrder,
  type Order,
  type OrderStatus,
} from "../lib/orders";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/empty-state";

export function SupplierOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["supplier-orders", status],
    queryFn: () => listSupplierOrders(status ? { status } : {}),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => confirmOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
  const dispatchMut = useMutation({
    mutationFn: (id: string) => dispatchOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
  const deliverMut = useMutation({
    mutationFn: (id: string) => deliverOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });

  const anyError = (confirmMut.error ?? dispatchMut.error ?? deliverMut.error) as Error | null;

  return (
    <div>
      <PageHeader
        title="Incoming orders"
        description="Confirm, dispatch and mark delivered — status moves forward with no skips."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="supplier-status" className="text-xs font-medium text-stone-600">
          Status
        </label>
        <Select
          id="supplier-status"
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
        {anyError && <span className="text-xs text-red-600">{anyError.message}</span>}
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
          title="No orders yet"
          description={
            status
              ? `No orders with status “${status}”.`
              : "Incoming orders from buyers will appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((order) => (
            <IncomingOrderCard
              key={order.id}
              order={order}
              onConfirm={(id) => confirmMut.mutate(id)}
              onDispatch={(id) => dispatchMut.mutate(id)}
              onDeliver={(id) => deliverMut.mutate(id)}
              busy={confirmMut.isPending || dispatchMut.isPending || deliverMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IncomingOrderCard({
  order,
  onConfirm,
  onDispatch,
  onDeliver,
  busy,
}: {
  order: Order;
  onConfirm: (id: string) => void;
  onDispatch: (id: string) => void;
  onDeliver: (id: string) => void;
  busy: boolean;
}) {
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
        {order.status === "pending" && (
          <Button size="sm" onClick={() => onConfirm(order.id)} disabled={busy}>
            Confirm order
          </Button>
        )}
        {order.status === "confirmed" && (
          <Button size="sm" onClick={() => onDispatch(order.id)} disabled={busy}>
            Mark dispatched
          </Button>
        )}
        {order.status === "dispatched" && (
          <Button size="sm" onClick={() => onDeliver(order.id)} disabled={busy}>
            Mark delivered
          </Button>
        )}
        {order.status === "delivered" && (
          <span className="inline-flex h-8 items-center text-xs text-stone-500">
            Delivered — invoice generated
          </span>
        )}
        {order.status === "cancelled" && (
          <span className="inline-flex h-8 items-center text-xs text-stone-500">Cancelled</span>
        )}
      </div>
    </Card>
  );
}
