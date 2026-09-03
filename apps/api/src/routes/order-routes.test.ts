import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const dbMock = {
  product: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  order: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));
vi.mock("../lib/email.js", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/redis.js", () => ({
  redis: { incr: vi.fn().mockResolvedValue(1), expire: vi.fn() },
  checkRedis: vi.fn(),
}));
vi.mock("../lib/search.js", () => ({
  indexProduct: vi.fn(),
  removeProduct: vi.fn(),
  searchProducts: vi.fn(),
  ensureProductIndex: vi.fn().mockResolvedValue(undefined),
}));

const { buildApp } = await import("../app.js");
const { sendEmail } = await import("../lib/email.js");

const BUYER_ID = "123e4567-e89b-42d3-a456-426614174001";
const SUPPLIER_A = "123e4567-e89b-42d3-a456-426614174002";
const SUPPLIER_B = "123e4567-e89b-42d3-a456-426614174003";
const PRODUCT_A1 = "123e4567-e89b-42d3-a456-426614174010";
const PRODUCT_B = "123e4567-e89b-42d3-a456-426614174012";

function authHeader(userId: string, role: "buyer" | "supplier" = "buyer") {
  const token = jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET ?? "dev-access-secret");
  return { authorization: `Bearer ${token}` };
}

function makeProduct(id: string, supplierId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    supplierId,
    categoryId: "123e4567-e89b-42d3-a456-426614174020",
    name: `Product ${id}`,
    sku: `SKU-${id.slice(-4)}`,
    description: null,
    unit: "kg",
    price: 4200,
    currency: "TND",
    minOrderQty: 2,
    leadTimeDays: 2,
    stockAvailable: true,
    images: [],
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: {
      id: supplierId,
      email: `supplier-${supplierId}@coffee.test`,
      businessName: "Demo Supplies Co",
    },
    ...overrides,
  };
}

const productA1 = makeProduct(PRODUCT_A1, SUPPLIER_A);
const productB = makeProduct(PRODUCT_B, SUPPLIER_B);

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$transaction.mockImplementation(async (fn: unknown) => {
    return (fn as (tx: typeof dbMock) => Promise<unknown>)(dbMock);
  });
});

describe("POST /api/v1/orders", () => {
  it("creates a single order and emails the supplier", async () => {
    dbMock.product.findMany.mockResolvedValue([productA1]);
    dbMock.user.findUnique.mockResolvedValue(productA1.supplier);
    dbMock.order.create.mockResolvedValue({
      id: "order-1",
      buyerId: BUYER_ID,
      supplierId: SUPPLIER_A,
      status: "pending",
      currency: "TND",
      totalAmount: 8400,
      items: [{ productId: PRODUCT_A1, quantity: 2, unitPrice: 4200, subtotal: 8400 }],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(BUYER_ID),
      payload: { items: [{ productId: PRODUCT_A1, quantity: 2 }] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].totalAmount).toBe(8400);
    const createCall = dbMock.order.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.buyerId).toBe(BUYER_ID);
    expect(createCall.data.status).toBeUndefined(); // default pending
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      "supplier-123e4567-e89b-42d3-a456-426614174002@coffee.test",
      expect.any(String),
      expect.any(String),
    );
  });

  it("splits items into one order per supplier", async () => {
    dbMock.product.findMany.mockResolvedValue([productA1, productB]);
    dbMock.user.findUnique.mockResolvedValue(productA1.supplier);
    dbMock.order.create.mockImplementation(async ({ data }) => ({
      id: `order-${data.supplierId}`,
      buyerId: data.buyerId,
      supplierId: data.supplierId,
      status: "pending",
      currency: data.currency,
      totalAmount: data.totalAmount,
      items: data.items.create.map((oi: { productId: string; quantity: number }) => ({
        productId: oi.productId,
        quantity: oi.quantity,
        unitPrice: 4200,
        subtotal: 4200 * oi.quantity,
      })),
    }));

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(BUYER_ID),
      payload: { items: [{ productId: PRODUCT_A1, quantity: 2 }, { productId: PRODUCT_B, quantity: 2 }] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.orders).toHaveLength(2);
    expect(body.orders.map((o: { supplierId: string }) => o.supplierId).sort()).toEqual(
      [SUPPLIER_A, SUPPLIER_B].sort(),
    );
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("rejects with 400 when a product is missing or archived", async () => {
    dbMock.product.findMany.mockResolvedValue([productA1]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(BUYER_ID),
      payload: { items: [{ productId: PRODUCT_B, quantity: 2 }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("PRODUCT_NOT_AVAILABLE");
    expect(dbMock.order.create).not.toHaveBeenCalled();
  });

  it("rejects with 400 when a product is out of stock", async () => {
    dbMock.product.findMany.mockResolvedValue([makeProduct(PRODUCT_A1, SUPPLIER_A, { stockAvailable: false })]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(BUYER_ID),
      payload: { items: [{ productId: PRODUCT_A1, quantity: 2 }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("PRODUCT_OUT_OF_STOCK");
    expect(dbMock.order.create).not.toHaveBeenCalled();
  });

  it("rejects with 400 when quantity is below MOQ", async () => {
    dbMock.product.findMany.mockResolvedValue([productA1]); // minOrderQty 2
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(BUYER_ID),
      payload: { items: [{ productId: PRODUCT_A1, quantity: 1 }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BELOW_MINIMUM_ORDER_QTY");
    expect(dbMock.order.create).not.toHaveBeenCalled();
  });

  it("rejects with 400 on invalid payload", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(BUYER_ID),
      payload: { items: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects supplier role with 403", async () => {
    dbMock.product.findMany.mockResolvedValue([productA1]);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: authHeader(SUPPLIER_A, "supplier"),
      payload: { items: [{ productId: PRODUCT_A1, quantity: 2 }] },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects unauthenticated with 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: { items: [{ productId: PRODUCT_A1, quantity: 2 }] },
    });
    expect(res.statusCode).toBe(401);
  });
});
