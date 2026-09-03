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

export function SupplierOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-800">Incoming Orders</h1>

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
            <IncomingOrderCard
              key={order.id}
              order={order}
              onConfirm={(id) => confirmMut.mutate(id)}
              onDispatch={(id) => dispatchMut.mutate(id)}
              onDeliver={(id) => deliverMut.mutate(id)}
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
}: {
  order: Order;
  onConfirm: (id: string) => void;
  onDispatch: (id: string) => void;
  onDeliver: (id: string) => void;
}) {
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
        {order.status === "pending" && (
          <button
            onClick={() => onConfirm(order.id)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Confirm
          </button>
        )}
        {order.status === "confirmed" && (
          <button
            onClick={() => onDispatch(order.id)}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            Dispatch
          </button>
        )}
        {order.status === "dispatched" && (
          <button
            onClick={() => onDeliver(order.id)}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Mark delivered
          </button>
        )}
      </div>
    </div>
  );
}
