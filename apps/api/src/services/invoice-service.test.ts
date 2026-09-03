import { describe, expect, it, vi, beforeEach } from "vitest";

const orderBase = {
  id: "ord-1",
  buyerId: "buyer-1",
  supplierId: "supplier-1",
  status: "delivered" as const,
  totalAmount: 8400,
  currency: "TND",
  notes: null,
  createdAt: new Date(),
  confirmedAt: new Date(),
  dispatchedAt: new Date(),
  deliveredAt: new Date(),
  cancelledAt: null,
};

const dbMock = {
  invoice: {
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  order: {
    findUnique: vi.fn(),
  },
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));

const {
  ensureInvoiceForOrder,
  markOverdueInvoices,
  getInvoice,
  getInvoicePdf,
} = await import("./invoice-service.js");

const existingInvoice = {
  id: "inv-1",
  orderId: "ord-1",
  invoiceNumber: "INV-2026-0001",
  issuedAt: new Date(),
  dueDate: new Date(),
  status: "unpaid",
  pdfUrl: null,
  createdAt: new Date(),
};

function deliveredOrder(overrides: Record<string, unknown> = {}) {
  return {
    ...orderBase,
    id: "ord-1",
    items: [
      {
        id: "oi-1",
        orderId: "ord-1",
        productId: "p-1",
        quantity: 2,
        unitPrice: 4200,
        subtotal: 8400,
        product: { name: "Espresso Beans", sku: "ESP-1", unit: "kg" },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureInvoiceForOrder", () => {
  it("creates an unpaid invoice with a sequenced number for a delivered order", async () => {
    dbMock.order.findUnique.mockResolvedValue(deliveredOrder());
    dbMock.invoice.findUnique.mockResolvedValue(null);
    dbMock.invoice.count.mockResolvedValue(1);
    dbMock.invoice.create.mockResolvedValue({ ...existingInvoice, invoiceNumber: "INV-2026-0002" });

    await ensureInvoiceForOrder("ord-1");

    expect(dbMock.invoice.create).toHaveBeenCalledTimes(1);
    const createArgs = dbMock.invoice.create.mock.calls[0]![0].data;
    expect(createArgs.orderId).toBe("ord-1");
    expect(createArgs.status).toBe("unpaid");
    expect(createArgs.invoiceNumber).toContain("INV-");
    expect(createArgs.dueDate).toBeInstanceOf(Date);
  });

  it("reuses an existing invoice for the order", async () => {
    dbMock.invoice.findUnique.mockResolvedValue(existingInvoice);
    const invoice = await ensureInvoiceForOrder("ord-1");
    expect(invoice).toEqual(existingInvoice);
    expect(dbMock.invoice.create).not.toHaveBeenCalled();
  });

  it("throws 409 when the order is not delivered", async () => {
    dbMock.invoice.findUnique.mockResolvedValue(null);
    dbMock.order.findUnique.mockResolvedValue(deliveredOrder({ status: "confirmed" }));
    await expect(ensureInvoiceForOrder("ord-1")).rejects.toMatchObject({
      statusCode: 409,
      code: "INVALID_ORDER_STATUS",
    });
    expect(dbMock.invoice.create).not.toHaveBeenCalled();
  });
});

describe("markOverdueInvoices", () => {
  it("marks unpaid past-due invoices as overdue", async () => {
    dbMock.invoice.updateMany.mockResolvedValue({ count: 3 });
    const count = await markOverdueInvoices();
    expect(count).toBe(3);
    const args = dbMock.invoice.updateMany.mock.calls[0]![0];
    expect(args.data.status).toBe("overdue");
    expect(args.where.status).toBe("unpaid");
    expect(args.where.dueDate.lt).toBeInstanceOf(Date);
  });
});

describe("invoice access + pdf", () => {
  it("allows the buyer and supplier, denies a stranger", async () => {
    dbMock.invoice.findUnique.mockResolvedValue(existingInvoice);
    dbMock.order.findUnique.mockResolvedValue({
      ...deliveredOrder(),
      buyer: { id: "buyer-1", businessName: "Buyer", address: null, vatId: null },
      supplier: { id: "supplier-1", businessName: "Supplier", address: null, vatId: null },
    });

    await expect(getInvoice("inv-1", "buyer-1", "buyer")).resolves.toBeDefined();
    await expect(getInvoice("inv-1", "supplier-1", "supplier")).resolves.toBeDefined();
    await expect(getInvoice("inv-1", "stranger", "buyer")).rejects.toMatchObject({
      statusCode: 404,
      code: "INVOICE_NOT_FOUND",
    });
  });

  it("generates a parseable PDF", async () => {
    dbMock.invoice.findUnique.mockResolvedValue(existingInvoice);
    dbMock.order.findUnique.mockResolvedValue({
      ...deliveredOrder(),
      buyer: { id: "buyer-1", businessName: "Buyer", address: null, vatId: null },
      supplier: { id: "supplier-1", businessName: "Supplier", address: null, vatId: null },
    });

    const pdf = await getInvoicePdf("inv-1", "buyer-1", "buyer");
    expect(pdf).toBeInstanceOf(Uint8Array);
    const bytes = Buffer.from(pdf);
    expect(bytes.length).toBeGreaterThan(100);
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  });
});
