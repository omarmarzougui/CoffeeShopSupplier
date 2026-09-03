import type { Order, OrderItem, OrderStatus } from "@prisma/client";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";
import { sendEmail } from "../lib/email.js";
import { ensureInvoiceForOrder } from "./invoice-service.js";
import type { ListOrdersQuery } from "../schemas/order-schemas.js";

const ORDER_NOT_FOUND = new AppError(404, "ORDER_NOT_FOUND", "Order not found");

const FORWARD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
  cancelled: [],
};

export interface SupplierOrderListResult {
  items: (Order & { items: OrderItemWithProduct[] })[];
  total: number;
  page: number;
  limit: number;
}

type OrderItemWithProduct = OrderItem & {
  product: { name: string; sku: string; unit: string };
};

async function getOwnedOrder(
  supplierId: string,
  orderId: string,
): Promise<Order & { items: OrderItemWithProduct[] }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
  });
  if (!order || order.supplierId !== supplierId) {
    throw ORDER_NOT_FOUND;
  }
  return order;
}

export async function listIncomingOrders(
  supplierId: string,
  query: ListOrdersQuery,
): Promise<SupplierOrderListResult> {
  const { page, limit, status } = query;
  const where = {
    supplierId,
    ...(status ? { status: status as OrderStatus } : {}),
  };
  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
    }),
    db.order.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getIncomingOrder(
  supplierId: string,
  orderId: string,
): Promise<Order & { items: OrderItemWithProduct[] }> {
  return getOwnedOrder(supplierId, orderId);
}

async function transition(
  supplierId: string,
  orderId: string,
  to: Exclude<OrderStatus, "cancelled">,
): Promise<Order> {
  const order = await getOwnedOrder(supplierId, orderId);
  const allowed = FORWARD_TRANSITIONS[order.status];
  if (!allowed?.includes(to)) {
    throw new AppError(
      409,
      "INVALID_ORDER_STATUS",
      `Order cannot transition from "${order.status}" to "${to}"`,
    );
  }

  const timestamps =
    to === "confirmed"
      ? { confirmedAt: new Date() }
      : to === "dispatched"
        ? { dispatchedAt: new Date() }
        : { deliveredAt: new Date() };

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: to, ...timestamps },
  });

  if (to === "confirmed" || to === "dispatched" || to === "delivered") {
    await sendOrderStatusEmail(order, to).catch(() => {
      // Email is best-effort; the transition must not fail if sending fails
    });
  }

  if (to === "delivered") {
    await ensureInvoiceForOrder(order.id).catch(() => {
      // Invoice auto-generation is best-effort here; it can be retried later
    });
  }

  return updated;
}

async function sendOrderStatusEmail(
  order: Order,
  status: OrderStatus,
): Promise<void> {
  const buyer = await db.user.findUnique({ where: { id: order.buyerId } });
  if (!buyer) return;
  await sendEmail(
    buyer.email,
    `Order ${order.id} ${status}`,
    `<p>Your order ${order.id} has been ${status}.</p>`,
  );
}

export function confirmOrder(supplierId: string, orderId: string): Promise<Order> {
  return transition(supplierId, orderId, "confirmed");
}

export function dispatchOrder(supplierId: string, orderId: string): Promise<Order> {
  return transition(supplierId, orderId, "dispatched");
}

export function deliverOrder(supplierId: string, orderId: string): Promise<Order> {
  return transition(supplierId, orderId, "delivered");
}
