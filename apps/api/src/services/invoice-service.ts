import type { Invoice, Order } from "@prisma/client";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";

const INVOICE_NOT_FOUND = new AppError(404, "INVOICE_NOT_FOUND", "Invoice not found");

type InvoiceOrder = Order & {
  buyer: { id: string; businessName: string; address: string | null; vatId: string | null };
  supplier: { id: string; businessName: string; address: string | null; vatId: string | null };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: { name: string; sku: string; unit: string };
  }[];
};

function dueDateFrom(issuedAt: Date): Date {
  const days = Number(process.env.INVOICE_DUE_DAYS ?? 30);
  return new Date(issuedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

// Generates (or reuses) the invoice for a delivered order and returns it.
export async function ensureInvoiceForOrder(orderId: string): Promise<Invoice | null> {
  const existing = await db.invoice.findUnique({ where: { orderId } });
  if (existing) return existing;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  if (order.status !== "delivered") {
    throw new AppError(
      409,
      "INVALID_ORDER_STATUS",
      "An invoice is only generated once an order is delivered",
    );
  }

  const issuedAt = new Date();
  const year = issuedAt.getUTCFullYear();
  const prefix = `INV-${year}-`;
  const seq = (await db.invoice.count({ where: { invoiceNumber: { startsWith: prefix } } })) + 1;
  const invoiceNumber = `${prefix}${String(seq).padStart(4, "0")}`;

  return db.invoice.create({
    data: { orderId, invoiceNumber, issuedAt, dueDate: dueDateFrom(issuedAt), status: "unpaid" },
  });
}

async function loadInvoiceWithOrder(invoiceId: string): Promise<{ invoice: Invoice; order: InvoiceOrder }> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw INVOICE_NOT_FOUND;
  const order = await db.order.findUnique({
    where: { id: invoice.orderId },
    include: {
      buyer: { select: { id: true, businessName: true, address: true, vatId: true } },
      supplier: { select: { id: true, businessName: true, address: true, vatId: true } },
      items: {
        include: { product: { select: { name: true, sku: true, unit: true } } },
      },
    },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return { invoice, order };
}

export function assertInvoiceAccess(
  userId: string,
  userRole: string,
  order: InvoiceOrder,
): void {
  if (userRole === "admin") return;
  if (userId !== order.buyer.id && userId !== order.supplier.id) {
    throw INVOICE_NOT_FOUND;
  }
}

export async function getInvoice(invoiceId: string, userId: string, userRole: string): Promise<{ invoice: Invoice; order: InvoiceOrder }> {
  const { invoice, order } = await loadInvoiceWithOrder(invoiceId);
  assertInvoiceAccess(userId, userRole, order);
  return { invoice, order };
}

export async function getInvoicePdf(
  invoiceId: string,
  userId: string,
  userRole: string,
): Promise<Uint8Array> {
  const { invoice, order } = await loadInvoiceWithOrder(invoiceId);
  assertInvoiceAccess(userId, userRole, order);
  return buildInvoicePdf(invoice, order);
}

async function buildInvoicePdf(invoice: Invoice, order: InvoiceOrder): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0.1, 0.1, 0.1);

  page.drawText("INVOICE", { x: 48, y: 780, size: 24, font: bold, color: black });
  page.drawText(`Number: ${invoice.invoiceNumber}`, { x: 48, y: 754, size: 11, font });
  page.drawText(
    `Issued: ${invoice.issuedAt.toISOString().slice(0, 10)}`,
    { x: 48, y: 738, size: 11, font, color: gray },
  );
  page.drawText(
    `Due: ${invoice.dueDate.toISOString().slice(0, 10)}`,
    { x: 48, y: 722, size: 11, font, color: gray },
  );

  // Buyer / supplier blocks
  page.drawText("Bill to", { x: 48, y: 690, size: 10, font: bold, color: gray });
  page.drawText(order.buyer.businessName, { x: 48, y: 674, size: 12, font });
  if (order.buyer.address) page.drawText(order.buyer.address, { x: 48, y: 658, size: 10, font, color: gray });

  page.drawText("From", { x: 320, y: 690, size: 10, font: bold, color: gray });
  page.drawText(order.supplier.businessName, { x: 320, y: 674, size: 12, font });
  if (order.supplier.vatId) {
    page.drawText(`VAT: ${order.supplier.vatId}`, { x: 320, y: 658, size: 10, font, color: gray });
  }

  // Items table header
  let y = 620;
  page.drawText("Item", { x: 48, y, size: 10, font: bold, color: gray });
  page.drawText("Qty", { x: 300, y, size: 10, font: bold, color: gray });
  page.drawText("Unit", { x: 380, y, size: 10, font: bold, color: gray });
  page.drawText("Amount", { x: 480, y, size: 10, font: bold, color: gray });
  y -= 16;
  page.drawLine({ start: { x: 48, y }, end: { x: 548, y }, thickness: 0.5, color: gray });

  for (const item of order.items) {
    y -= 20;
    page.drawText(item.product.name, { x: 48, y, size: 10, font });
    page.drawText(String(item.quantity), { x: 300, y, size: 10, font });
    page.drawText(
      `${(item.unitPrice / 100).toFixed(2)} ${order.currency}`,
      { x: 380, y, size: 10, font },
    );
    page.drawText(
      `${(item.subtotal / 100).toFixed(2)} ${order.currency}`,
      { x: 480, y, size: 10, font },
    );
    if (y < 120) break;
  }

  y -= 24;
  page.drawLine({ start: { x: 48, y }, end: { x: 548, y }, thickness: 0.5, color: gray });
  y -= 20;
  page.drawText("Total", { x: 380, y, size: 12, font: bold, color: black });
  page.drawText(
    `${(order.totalAmount / 100).toFixed(2)} ${order.currency}`,
    { x: 480, y, size: 12, font: bold, color: black },
  );

  y -= 24;
  page.drawText(
    `Status: ${invoice.status.toUpperCase()}`,
    { x: 48, y, size: 10, font, color: gray },
  );

  return doc.save();
}

export async function markOverdueInvoices(): Promise<number> {
  const now = new Date();
  const result = await db.invoice.updateMany({
    where: { status: "unpaid", dueDate: { lt: now } },
    data: { status: "overdue" },
  });
  return result.count;
}
