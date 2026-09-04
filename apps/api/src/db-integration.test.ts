import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let buyerId: string;
let supplierId: string;
let productId: string;
let categoryId: string;

beforeAll(async () => {
  // Clean DB in correct order (respect FK constraints)
  await prisma.auditLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create test category
  const cat = await prisma.category.create({
    data: { name: "DB Test Beans", slug: "db-test-beans" },
  });
  categoryId = cat.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean test data between tests
  await prisma.auditLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
});

// These tests exercise real Prisma + real PostgreSQL
describe("DB integration: user registration", () => {
  it("creates a buyer and a supplier in the real database", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 4);

    const buyer = await prisma.user.create({
      data: {
        email: "db-buyer@test.com",
        passwordHash: hash,
        role: "buyer",
        businessName: "DB Buyer Co",
      },
    });
    buyerId = buyer.id;
    expect(buyer.role).toBe("buyer");

    const supplier = await prisma.user.create({
      data: {
        email: "db-supplier@test.com",
        passwordHash: hash,
        role: "supplier",
        businessName: "DB Supplier Co",
      },
    });
    supplierId = supplier.id;
    expect(supplier.role).toBe("supplier");
  });
});

describe("DB integration: product + order lifecycle", () => {
  beforeEach(async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 4);

    const buyer = await prisma.user.create({
      data: { email: "db-buyer@test.com", passwordHash: hash, role: "buyer", businessName: "DB Buyer Co" },
    });
    buyerId = buyer.id;

    const supplier = await prisma.user.create({
      data: { email: "db-supplier@test.com", passwordHash: hash, role: "supplier", businessName: "DB Supplier Co" },
    });
    supplierId = supplier.id;

    const product = await prisma.product.create({
      data: {
        supplierId,
        categoryId,
        name: "DB Espresso 1kg",
        sku: "DB-ESP-001",
        unit: "kg",
        price: 32000,
        minOrderQty: 2,
      },
    });
    productId = product.id;
  });

  it("creates an order with items and transitions through the state machine", async () => {
    // Create order
    const order = await prisma.order.create({
      data: {
        buyerId,
        supplierId,
        totalAmount: 96000,
        items: {
          create: [{ productId, quantity: 3, unitPrice: 32000, subtotal: 96000 }],
        },
      },
      include: { items: true },
    });
    expect(order.status).toBe("pending");
    expect(order.items).toHaveLength(1);

    // Confirm
    const confirmed = await prisma.order.update({
      where: { id: order.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });
    expect(confirmed.status).toBe("confirmed");

    // Dispatch
    const dispatched = await prisma.order.update({
      where: { id: order.id },
      data: { status: "dispatched", dispatchedAt: new Date() },
    });
    expect(dispatched.status).toBe("dispatched");

    // Deliver
    const delivered = await prisma.order.update({
      where: { id: order.id },
      data: { status: "delivered", deliveredAt: new Date() },
    });
    expect(delivered.status).toBe("delivered");

    // Invoice auto-created
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber: "INV-2026-0001",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    expect(invoice.status).toBe("unpaid");

    // Mark overdue
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "overdue" },
    });
    const overdue = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(overdue?.status).toBe("overdue");
  });

  it("creates audit log entries", async () => {
    const order = await prisma.order.create({
      data: {
        buyerId,
        supplierId,
        totalAmount: 32000,
        items: {
          create: [{ productId, quantity: 1, unitPrice: 32000, subtotal: 32000 }],
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ORDER_CREATED",
        entityType: "order",
        entityId: order.id,
        metadata: { buyerId, totalAmount: 32000 },
      },
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityType: "order", entityId: order.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe("ORDER_CREATED");
  });

  it("enforces unique SKU per supplier", async () => {
    await prisma.product.create({
      data: { supplierId, categoryId, name: "Unique", sku: "UNIQUE-SKU", unit: "kg", price: 1000 },
    });

    await expect(
      prisma.product.create({
        data: { supplierId, categoryId, name: "Dupe", sku: "UNIQUE-SKU", unit: "kg", price: 2000 },
      }),
    ).rejects.toThrow();
  });

  it("cascades order item deletion on order delete", async () => {
    const order = await prisma.order.create({
      data: {
        buyerId,
        supplierId,
        totalAmount: 64000,
        items: {
          create: [
            { productId, quantity: 2, unitPrice: 32000, subtotal: 64000 },
          ],
        },
      },
      include: { items: true },
    });
    const itemId = order.items[0]!.id;

    await prisma.order.delete({ where: { id: order.id } });

    const orphaned = await prisma.orderItem.findUnique({ where: { id: itemId } });
    expect(orphaned).toBeNull();
  });
});

describe("DB integration: refresh token rotation", () => {
  it("creates, revokes, and re-issues refresh tokens", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 4);
    const user = await prisma.user.create({
      data: { email: "rt@test.com", passwordHash: hash, role: "buyer", businessName: "RT Co" },
    });

    const token1 = await prisma.refreshToken.create({
      data: { tokenHash: "hash1", userId: user.id, expiresAt: new Date(Date.now() + 86400000) },
    });
    expect(token1.revokedAt).toBeNull();

    await prisma.refreshToken.update({
      where: { id: token1.id },
      data: { revokedAt: new Date() },
    });

    const token2 = await prisma.refreshToken.create({
      data: { tokenHash: "hash2", userId: user.id, expiresAt: new Date(Date.now() + 86400000) },
    });
    expect(token2.revokedAt).toBeNull();

    const revokedCount = await prisma.refreshToken.count({
      where: { userId: user.id, revokedAt: { not: null } },
    });
    expect(revokedCount).toBe(1);
  });
});
