import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const createOrdersSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "dispatched", "delivered", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateOrdersInput = z.infer<typeof createOrdersSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
