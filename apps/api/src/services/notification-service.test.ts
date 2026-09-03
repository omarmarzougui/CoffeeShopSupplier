import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMock = {
  order: { findUnique: vi.fn() },
  invoice: { findUnique: vi.fn(), findMany: vi.fn() },
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));
vi.mock("../lib/email.js", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

const { sendEmail } = await import("../lib/email.js");
const {
  notifySupplierOrderPlaced,
  notifyBuyerOrderStatus,
  notifyBuyerInvoiceOverdue,
} = await import("./notification-service.js");

const ORDER_ID = "ord-1";
const BUYER = { businessName: "Buyer Co", email: "buyer@test.com" };
const SUPPLIER = { businessName: "Supplier Inc", email: "supplier@test.com" };

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    buyerId: "buyer-1",
    supplierId: "supplier-1",
    status: "pending",
    totalAmount: 8400,
    currency: "TND",
    notes: null,
    createdAt: new Date(),
    confirmedAt: null,
    dispatchedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifySupplierOrderPlaced", () => {
  it("sends a styled email to the supplier with order details", async () => {
    dbMock.order.findUnique.mockResolvedValue({
      ...makeOrder(),
      buyer: BUYER,
      supplier: SUPPLIER,
      items: [{ product: { name: "Espresso Beans" }, quantity: 5, unitPrice: 4200, subtotal: 21000 }],
    });

    await notifySupplierOrderPlaced(ORDER_ID);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(to).toBe("supplier@test.com");
    expect(subject).toContain("New order");
    expect(subject).toContain("Buyer Co");
    expect(html).toContain("Espresso Beans");
    expect(html).toContain("Buyer Co");
  });

  it("does not throw when the order is not found", async () => {
    dbMock.order.findUnique.mockResolvedValue(null);
    await notifySupplierOrderPlaced("nonexistent");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("notifyBuyerOrderStatus", () => {
  const orderData = {
    ...makeOrder(),
    buyer: BUYER,
    supplier: SUPPLIER,
  };

  it("sends confirmed email with supplier name", async () => {
    dbMock.order.findUnique.mockResolvedValue(orderData);
    await notifyBuyerOrderStatus(ORDER_ID, "confirmed");
    const [, subject, html] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(subject).toContain("confirmed");
    expect(html).toContain("Supplier Inc");
  });

  it("sends dispatched email", async () => {
    dbMock.order.findUnique.mockResolvedValue(orderData);
    await notifyBuyerOrderStatus(ORDER_ID, "dispatched");
    const [, subject, html] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(subject).toContain("dispatched");
    expect(html).toContain("Supplier Inc");
  });

  it("sends delivered email with invoice details", async () => {
    dbMock.order.findUnique.mockResolvedValue({ ...orderData, deliveredAt: new Date() });
    dbMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      orderId: ORDER_ID,
      invoiceNumber: "INV-2026-0001",
      dueDate: new Date("2026-10-03"),
      status: "unpaid",
      pdfUrl: null,
      createdAt: new Date(),
    });
    await notifyBuyerOrderStatus(ORDER_ID, "delivered");
    const [, subject, html] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(subject).toContain("delivered");
    expect(html).toContain("INV-2026-0001");
    expect(html).toContain("2026-10-03");
  });

  it("does not send email for pending/cancelled statuses", async () => {
    dbMock.order.findUnique.mockResolvedValue(orderData);
    await notifyBuyerOrderStatus(ORDER_ID, "pending");
    await notifyBuyerOrderStatus(ORDER_ID, "cancelled");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("notifyBuyerInvoiceOverdue", () => {
  it("sends overdue email with amount and supplier name", async () => {
    dbMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      orderId: ORDER_ID,
      invoiceNumber: "INV-2026-0002",
      dueDate: new Date("2026-09-01"),
      status: "overdue",
      pdfUrl: null,
      createdAt: new Date(),
      order: {
        id: ORDER_ID,
        totalAmount: 8400,
        currency: "TND",
        buyer: BUYER,
        supplier: SUPPLIER,
      },
    });

    await notifyBuyerInvoiceOverdue("inv-1");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(to).toBe("buyer@test.com");
    expect(subject).toContain("overdue");
    expect(html).toContain("INV-2026-0002");
    expect(html).toContain("Supplier Inc");
    expect(html).toContain("84.00 TND");
  });

  it("does not send when invoice is not overdue", async () => {
    dbMock.invoice.findUnique.mockResolvedValue({ ...makeOrder(), status: "paid" });
    await notifyBuyerInvoiceOverdue("inv-1");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
