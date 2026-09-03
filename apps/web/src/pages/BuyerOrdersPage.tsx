import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMinorUnits } from "@coffee/utils";
import {
  listBuyerOrders,
  cancelOrder,
  reorderOrder,
  type Order,
  type OrderStatus,
} from "../lib/orders";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export function BuyerOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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
      <h1 className="mb-6 text-2xl font-bold text-stone-800">My Orders</h1>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-stone-500">Filter:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-stone-400">Loading orders...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="py-8 text-center text-stone-400">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {data.items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={(id) => cancelMut.mutate(id)}
              onReorder={(id) => reorderMut.mutate(id)}
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
}: {
  order: Order;
  onCancel: (id: string) => void;
  onReorder: (id: string) => void;
}) {
  const cancellable = order.status === "pending" || order.status === "confirmed";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-sm text-stone-500"># {order.id.slice(0, 8)}</span>
          <span
            className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <span className="font-bold text-amber-700">
          {formatMinorUnits(order.totalAmount, order.currency)}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-stone-100 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-2">
            <div>
              <span className="font-medium text-stone-800">{item.product.name}</span>
              <span className="ml-2 text-stone-400">
                {item.quantity} × {formatMinorUnits(item.unitPrice, order.currency)}
              </span>
            </div>
            <span className="text-stone-600">{formatMinorUnits(item.subtotal, order.currency)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
        {cancellable && (
          <button
            onClick={() => onCancel(order.id)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Cancel order
          </button>
        )}
        <button
          onClick={() => onReorder(order.id)}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Reorder
        </button>
      </div>
    </div>
  );
}
