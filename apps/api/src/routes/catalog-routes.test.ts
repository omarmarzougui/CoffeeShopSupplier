import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const dbMock = {
  category: {
    findMany: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));
vi.mock("../lib/email.js", () => ({ sendEmail: vi.fn() }));
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

const BUYER_ID = "123e4567-e89b-42d3-a456-426614174010";
const SUPPLIER_ID = "123e4567-e89b-42d3-a456-426614174011";
const PRODUCT_ID = "123e4567-e89b-42d3-a456-426614174012";
const CATEGORY_ID = "123e4567-e89b-42d3-a456-426614174013";
const PARENT_CATEGORY_ID = "123e4567-e89b-42d3-a456-426614174014";

function authHeader(userId: string, role: "buyer" | "supplier" | "admin" = "buyer") {
  const token = jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET ?? "dev-access-secret");
  return { authorization: `Bearer ${token}` };
}

const rootCategory = {
  id: PARENT_CATEGORY_ID,
  name: "Coffee & Hot Beverages",
  slug: "coffee-hot-beverages",
  parentId: null,
  createdAt: new Date(),
};

const childCategory = {
  id: CATEGORY_ID,
  name: "Espresso Beans",
  slug: "espresso-beans",
  parentId: PARENT_CATEGORY_ID,
  createdAt: new Date(),
};

const product = {
  id: PRODUCT_ID,
  supplierId: SUPPLIER_ID,
  categoryId: CATEGORY_ID,
  name: "Espresso Beans 1kg",
  sku: "ESP-1KG",
  description: "Single origin",
  unit: "kg",
  price: 4200,
  currency: "TND",
  minOrderQty: 1,
  leadTimeDays: 2,
  stockAvailable: true,
  images: [],
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const supplier = {
  id: SUPPLIER_ID,
  email: "supplier@coffee.test",
  role: "supplier",
  businessName: "Demo Supplies Co",
  logoUrl: "https://example.com/logo.png",
  phone: "+216123",
  address: "Tunis",
  verifiedAt: new Date(),
  _count: { products: 5 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/categories", () => {
  it("returns the category tree", async () => {
    const app = await buildApp();
    dbMock.category.findMany.mockResolvedValue([rootCategory, childCategory]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: authHeader(BUYER_ID),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(PARENT_CATEGORY_ID);
    expect(body[0].children).toHaveLength(1);
    expect(body[0].children[0].name).toBe("Espresso Beans");
  });

  it("rejects unauthenticated with 401", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/categories" });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/v1/products/:id", () => {
  it("returns a public product detail with category and supplier", async () => {
    const app = await buildApp();
    dbMock.product.findUnique.mockResolvedValue({
      ...product,
      category: childCategory,
      supplier: { id: SUPPLIER_ID, businessName: "Demo Supplies Co" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/products/${PRODUCT_ID}`,
      headers: authHeader(BUYER_ID),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(PRODUCT_ID);
    expect(res.json().name).toBe("Espresso Beans 1kg");
  });

  it("returns 404 for archived or missing product", async () => {
    const app = await buildApp();
    dbMock.product.findUnique.mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/products/${PRODUCT_ID}`,
      headers: authHeader(BUYER_ID),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("PRODUCT_NOT_FOUND");
  });
});

describe("GET /api/v1/suppliers/:id", () => {
  it("returns supplier profile with product count", async () => {
    const app = await buildApp();
    dbMock.user.findUnique.mockResolvedValue(supplier);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/suppliers/${SUPPLIER_ID}`,
      headers: authHeader(BUYER_ID),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.businessName).toBe("Demo Supplies Co");
    expect(body.verified).toBe(true);
    expect(body.productCount).toBe(5);
  });

  it("returns 404 for non-supplier user", async () => {
    const app = await buildApp();
    dbMock.user.findUnique.mockResolvedValue({
      ...supplier,
      id: BUYER_ID,
      role: "buyer",
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/suppliers/${BUYER_ID}`,
      headers: authHeader(BUYER_ID),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("SUPPLIER_NOT_FOUND");
  });
});
