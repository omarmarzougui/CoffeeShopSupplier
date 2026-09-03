import { apiFetch } from "./api";

export type OrderStatus = "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { name: string; sku: string; unit: string };
}

export interface Order {
  id: string;
  buyerId: string;
  supplierId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface ListOrdersParams {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

// Buyer
export function listBuyerOrders(params: ListOrdersParams = {}): Promise<OrderListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch(`/api/v1/orders${query ? `?${query}` : ""}`);
}

export function getBuyerOrder(id: string): Promise<Order> {
  return apiFetch(`/api/v1/orders/${id}`);
}

export function cancelOrder(id: string): Promise<Order> {
  return apiFetch(`/api/v1/orders/${id}/cancel`, { method: "POST" });
}

export function reorderOrder(id: string): Promise<{ orders: Order[] }> {
  return apiFetch(`/api/v1/orders/${id}/reorder`, { method: "POST" });
}

// Supplier
export function listSupplierOrders(params: ListOrdersParams = {}): Promise<OrderListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch(`/api/v1/supplier/orders${query ? `?${query}` : ""}`);
}

export function confirmOrder(id: string): Promise<Order> {
  return apiFetch(`/api/v1/supplier/orders/${id}/confirm`, { method: "PATCH" });
}

export function dispatchOrder(id: string): Promise<Order> {
  return apiFetch(`/api/v1/supplier/orders/${id}/dispatch`, { method: "PATCH" });
}

export function deliverOrder(id: string): Promise<Order> {
  return apiFetch(`/api/v1/supplier/orders/${id}/deliver`, { method: "PATCH" });
}
