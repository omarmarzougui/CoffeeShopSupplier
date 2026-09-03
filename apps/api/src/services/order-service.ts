import type { Order, OrderItem } from "@prisma/client";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";
import { sendEmail } from "../lib/email.js";
import type { CreateOrdersInput } from "../schemas/order-schemas.js";

interface CreateOrderResult {
  orders: (Order & { items: OrderItem[] })[];
}

export async function createOrders(
  buyerId: string,
  input: CreateOrdersInput,
): Promise<CreateOrderResult> {
  const products = await db.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) } },
    include: { supplier: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const unavailable = input.items.filter(
    (i) => !productMap.has(i.productId) || productMap.get(i.productId)!.archived,
  );
  if (unavailable.length > 0) {
    throw new AppError(
      400,
      "PRODUCT_NOT_AVAILABLE",
      "One or more products are unavailable",
      { productIds: unavailable.map((i) => i.productId) },
    );
  }

  for (const item of input.items) {
    const product = productMap.get(item.productId)!;
    if (!product.stockAvailable) {
      throw new AppError(400, "PRODUCT_OUT_OF_STOCK", `${product.name} is out of stock`, {
        productId: product.id,
      });
    }
    if (item.quantity < product.minOrderQty) {
      throw new AppError(
        400,
        "BELOW_MINIMUM_ORDER_QTY",
        `${product.name} requires a minimum order of ${product.minOrderQty}`,
        { productId: product.id, minOrderQty: product.minOrderQty },
      );
    }
  }

  const groups = new Map<string, typeof input.items>();
  for (const item of input.items) {
    const product = productMap.get(item.productId)!;
    if (!groups.has(product.supplierId)) {
      groups.set(product.supplierId, []);
    }
    groups.get(product.supplierId)!.push(item);
  }

  const orders: (Order & { items: OrderItem[] })[] = [];
  for (const [supplierId, groupItems] of groups) {
    const order = await db.$transaction(async (tx) => {
      const supplier = await tx.user.findUnique({ where: { id: supplierId } });
      const currency = productMap.get(groupItems[0]!.productId)!.currency;
      const orderItems = groupItems.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity,
        };
      });
      const totalAmount = orderItems.reduce((sum, oi) => sum + oi.subtotal, 0);

      const created = await tx.order.create({
        data: {
          buyerId,
          supplierId,
          currency,
          totalAmount,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      return { created, supplier };
    });

    orders.push(order.created);
    if (order.supplier) {
      await sendEmail(
        order.supplier.email,
        `New order ${order.created.id}`,
        `<p>You have a new order ${order.created.id} for ${order.created.totalAmount} ${order.created.currency}.</p>`,
      ).catch(() => {
        // Email is best-effort; order placement must not fail if sending fails
      });
    }
  }

  return { orders };
}
