import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createOrdersSchema } from "../schemas/order-schemas.js";
import { createOrders } from "../services/order-service.js";

const buyerOnly = requireRole("buyer");

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/orders", {
    preHandler: [requireAuth, buyerOnly],
  }, async (req) => {
    const parsed = createOrdersSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return createOrders(req.user!.sub, parsed.data);
  });
}
