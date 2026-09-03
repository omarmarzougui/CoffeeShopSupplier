import type { OrderStatus } from "@prisma/client";
import { db } from "../lib/db.js";
import { sendEmail } from "../lib/email.js";
import {
  orderPlacedSupplier,
  orderConfirmed,
  orderDispatched,
  orderDelivered,
  invoiceOverdue,
} from "./email-templates.js";

function formatDueDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── order lifecycle notifications ────────────────────────────────────

export async function notifySupplierOrderPlaced(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { businessName: true, email: true } },
      supplier: { select: { businessName: true, email: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (!order) return;

  await sendEmail(
    order.supplier.email,
    `New order #${order.id.slice(0, 8)} from ${order.buyer.businessName}`,
    orderPlacedSupplier({
      orderId: order.id,
      buyerName: order.buyer.businessName,
      items: order.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      totalAmount: order.totalAmount,
      currency: order.currency,
      notes: order.notes,
    }),
  ).catch(() => {});
}

export async function notifyBuyerOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { businessName: true, email: true } },
      supplier: { select: { businessName: true, email: true } },
    },
  });
  if (!order) return;

  let html: string;

  if (status === "confirmed") {
    html = orderConfirmed({
      orderId: order.id,
      supplierName: order.supplier.businessName,
    });
  } else if (status === "dispatched") {
    html = orderDispatched({
      orderId: order.id,
      supplierName: order.supplier.businessName,
    });
  } else if (status === "delivered") {
    const invoice = await db.invoice.findUnique({ where: { orderId: order.id } });
    const dueDate = invoice ? formatDueDate(invoice.dueDate) : "N/A";
    html = orderDelivered({
      orderId: order.id,
      supplierName: order.supplier.businessName,
      invoiceId: invoice?.id ?? "",
      invoiceNumber: invoice?.invoiceNumber ?? "pending",
      dueDate,
      totalAmount: order.totalAmount,
      currency: order.currency,
    });
  } else {
    return;
  }

  await sendEmail(
    order.buyer.email,
    `Order #${order.id.slice(0, 8)} ${status}`,
    html,
  ).catch(() => {});
}

// ── invoice overdue notification ─────────────────────────────────────

export async function notifyBuyerInvoiceOverdue(
  invoiceId: string,
): Promise<void> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          buyer: { select: { businessName: true, email: true } },
          supplier: { select: { businessName: true, email: true } },
        },
      },
    },
  });
  if (!invoice || invoice.status !== "overdue") return;

  await sendEmail(
    invoice.order.buyer.email,
    `Payment overdue — ${invoice.invoiceNumber}`,
    invoiceOverdue({
      orderId: invoice.order.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.order.totalAmount,
      currency: invoice.order.currency,
      dueDate: formatDueDate(invoice.dueDate),
      supplierName: invoice.order.supplier.businessName,
    }),
  ).catch(() => {});
}
