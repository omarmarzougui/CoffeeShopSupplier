import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const createOrdersSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
});

export type CreateOrdersInput = z.infer<typeof createOrdersSchema>;
