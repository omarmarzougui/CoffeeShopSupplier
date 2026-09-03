import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const dbMock = {
  order: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));
vi.mock("../lib/email.js", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../services/notification-service.js", () => ({
  notifySupplierOrderPlaced: vi.fn().mockResolvedValue(undefined),
  notifyBuyerOrderStatus: vi.fn().mockResolvedValue(undefined),
  notifyBuyerInvoiceOverdue: vi.fn().mockResolvedValue(undefined),
}));
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
const { notifyBuyerOrderStatus } = await import("../services/notification-service.js");

const BUYER_ID = "123e4567-e89b-42d3-a456-426614174001";
const SUPPLIER_A = "123e4567-e89b-42d3-a456-426614174002";
const SUPPLIER_B = "123e4567-e89b-42d3-a456-426614174003";
const ORDER_ID = "123e4567-e89b-42d3-a456-426614174100";

function authHeader(userId: string, role: "buyer" | "supplier" = "supplier") {
  const token = jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET ?? "dev-access-secret");
  return { authorization: `Bearer ${token}` };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    buyerId: BUYER_ID,
    supplierId: SUPPLIER_A,
    status: "pending",
    totalAmount: 8400,
    currency: "TND",
    notes: null,
    createdAt: new Date(),
    confirmedAt: null,
    dispatchedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    items: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/supplier/orders", () => {
  it("lists orders addressed to the supplier", async () => {
    dbMock.order.findMany.mockResolvedValue([makeOrder()]);
    dbMock.order.count.mockResolvedValue(1);
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/supplier/orders",
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    expect(dbMock.order.findMany.mock.calls[0]![0].where.supplierId).toBe(SUPPLIER_A);
  });

  it("rejects buyer role with 403", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/supplier/orders",
      headers: authHeader(BUYER_ID, "buyer"),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("GET /api/v1/supplier/orders/:id", () => {
  it("returns an order addressed to the supplier", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder());
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/supplier/orders/${ORDER_ID}`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(ORDER_ID);
  });

  it("returns 404 when the order belongs to another supplier", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ supplierId: SUPPLIER_B }));
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/supplier/orders/${ORDER_ID}`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("ORDER_NOT_FOUND");
  });
});

describe("supplier order transitions", () => {
  it("confirms a pending order and emails the buyer", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ status: "pending" }));
    dbMock.order.update.mockResolvedValue(makeOrder({ status: "confirmed", confirmedAt: new Date() }));
    dbMock.user.findUnique.mockResolvedValue({ id: BUYER_ID, email: "buyer@coffee.test" });

    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplier/orders/${ORDER_ID}/confirm`,
      headers: authHeader(SUPPLIER_A),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("confirmed");
    const updateCall = dbMock.order.update.mock.calls[0]![0];
    expect(updateCall.data.status).toBe("confirmed");
    expect(updateCall.data.confirmedAt).toBeInstanceOf(Date);
    expect(notifyBuyerOrderStatus).toHaveBeenCalledTimes(1);
    expect(notifyBuyerOrderStatus).toHaveBeenCalledWith(
      ORDER_ID,
      "confirmed",
    );
  });

  it("moves confirmed → dispatched with a timestamp", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ status: "confirmed" }));
    dbMock.order.update.mockResolvedValue(makeOrder({ status: "dispatched", dispatchedAt: new Date() }));
    dbMock.user.findUnique.mockResolvedValue({ id: BUYER_ID, email: "buyer@coffee.test" });

    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplier/orders/${ORDER_ID}/dispatch`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("dispatched");
  });

  it("moves dispatched → delivered with a timestamp", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ status: "dispatched" }));
    dbMock.order.update.mockResolvedValue(makeOrder({ status: "delivered", deliveredAt: new Date() }));
    dbMock.user.findUnique.mockResolvedValue({ id: BUYER_ID, email: "buyer@coffee.test" });

    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplier/orders/${ORDER_ID}/deliver`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("delivered");
  });

  it("rejects skipping states (pending → dispatch is 409)", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ status: "pending" }));
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplier/orders/${ORDER_ID}/dispatch`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("INVALID_ORDER_STATUS");
    expect(dbMock.order.update).not.toHaveBeenCalled();
  });

  it("rejects confirming an already-confirmed order (409)", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ status: "confirmed" }));
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplier/orders/${ORDER_ID}/confirm`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejects confirming another supplier's order (404)", async () => {
    dbMock.order.findUnique.mockResolvedValue(makeOrder({ status: "pending", supplierId: SUPPLIER_B }));
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplier/orders/${ORDER_ID}/confirm`,
      headers: authHeader(SUPPLIER_A),
    });
    expect(res.statusCode).toBe(404);
    expect(dbMock.order.update).not.toHaveBeenCalled();
  });
});
