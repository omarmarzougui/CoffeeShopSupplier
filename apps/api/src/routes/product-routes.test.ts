import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const dbMock = {
  product: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));
vi.mock("../lib/email.js", () => ({ sendEmail: vi.fn() }));
vi.mock("../lib/redis.js", () => ({
  redis: { incr: vi.fn().mockResolvedValue(1), expire: vi.fn() },
  checkRedis: vi.fn(),
}));

const { buildApp } = await import("../app.js");

const SUPPLIER_ID = "123e4567-e89b-42d3-a456-426614174002";
const OTHER_SUPPLIER_ID = "123e4567-e89b-42d3-a456-426614174003";

function authHeader(userId: string, role: "buyer" | "supplier" | "admin" = "supplier") {
  const token = jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET ?? "dev-access-secret");
  return { authorization: `Bearer ${token}` };
}

const CATEGORY_ID = "123e4567-e89b-42d3-a456-426614174001";

const product = {
  id: "123e4567-e89b-42d3-a456-426614174004",
  supplierId: SUPPLIER_ID,
  categoryId: CATEGORY_ID,
  name: "Espresso Beans 1kg",
  sku: "ESP-1KG",
  unit: "kg",
  price: 4200,
  currency: "TND",
  minOrderQty: 1,
  leadTimeDays: 2,
  stockAvailable: true,
  images: [],
  archived: false,
  description: null,
};

const validPayload = {
  name: "Espresso Beans 1kg",
  sku: "ESP-1KG",
  categoryId: CATEGORY_ID,
  unit: "kg",
  price: 4200,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.category.findUnique.mockResolvedValue({ id: CATEGORY_ID });
});

describe("POST /api/v1/products", () => {
  it("creates a product for the authenticated supplier", async () => {
    const app = await buildApp();
    dbMock.product.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...product,
      ...data,
    }));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: authHeader(SUPPLIER_ID),
      payload: validPayload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().supplierId).toBe(SUPPLIER_ID);
    expect(dbMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supplierId: SUPPLIER_ID, sku: "ESP-1KG" }),
      }),
    );
  });

  it("rejects buyer role with 403", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: authHeader("123e4567-e89b-42d3-a456-426614174005", "buyer"),
      payload: validPayload,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");
  });

  it("rejects unauthenticated with 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      payload: validPayload,
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when category missing", async () => {
    const app = await buildApp();
    dbMock.category.findUnique.mockResolvedValue(null);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: authHeader(SUPPLIER_ID),
      payload: validPayload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("CATEGORY_NOT_FOUND");
  });
});

describe("PATCH /api/v1/products/:id", () => {
  it("updates own product", async () => {
    const app = await buildApp();
    dbMock.product.findUnique.mockResolvedValue(product);
    dbMock.product.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...product,
      ...data,
    }));

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/products/123e4567-e89b-42d3-a456-426614174004",
      headers: authHeader(SUPPLIER_ID),
      payload: { price: 4500 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().price).toBe(4500);
  });

  it("hides other suppliers' products as 404", async () => {
    const app = await buildApp();
    dbMock.product.findUnique.mockResolvedValue({
      ...product,
      supplierId: OTHER_SUPPLIER_ID,
    });
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/products/123e4567-e89b-42d3-a456-426614174004",
      headers: authHeader(SUPPLIER_ID),
      payload: { price: 4500 },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("rejects empty update body with 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/products/123e4567-e89b-42d3-a456-426614174004",
      headers: authHeader(SUPPLIER_ID),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/v1/products/:id", () => {
  it("archives (soft delete) own product", async () => {
    const app = await buildApp();
    dbMock.product.findUnique.mockResolvedValue(product);
    dbMock.product.update.mockResolvedValue({ ...product, archived: true });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/products/123e4567-e89b-42d3-a456-426614174004",
      headers: authHeader(SUPPLIER_ID),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, id: "123e4567-e89b-42d3-a456-426614174004", archived: true });
    expect(dbMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archived: true } }),
    );
  });

  it("cannot archive another supplier's product", async () => {
    const app = await buildApp();
    dbMock.product.findUnique.mockResolvedValue({
      ...product,
      supplierId: OTHER_SUPPLIER_ID,
    });
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/products/123e4567-e89b-42d3-a456-426614174004",
      headers: authHeader(SUPPLIER_ID),
    });
    expect(res.statusCode).toBe(404);
  });
});
