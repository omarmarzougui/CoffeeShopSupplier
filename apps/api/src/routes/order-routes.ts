import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createOrdersSchema,
  listOrdersQuerySchema,
} from "../schemas/order-schemas.js";
import {
  cancelBuyerOrder,
  createOrders,
  getBuyerOrder,
  listBuyerOrders,
  reorderBuyerOrder,
} from "../services/order-service.js";

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

  app.get("/api/v1/orders", {
    preHandler: [requireAuth, buyerOnly],
  }, async (req) => {
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid query", parsed.error.flatten());
    }
    return listBuyerOrders(req.user!.sub, parsed.data);
  });

  app.get("/api/v1/orders/:id", {
    preHandler: [requireAuth, buyerOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return getBuyerOrder(req.user!.sub, id);
  });

  app.post("/api/v1/orders/:id/cancel", {
    preHandler: [requireAuth, buyerOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return cancelBuyerOrder(req.user!.sub, id);
  });

  app.post("/api/v1/orders/:id/reorder", {
    preHandler: [requireAuth, buyerOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return reorderBuyerOrder(req.user!.sub, id);
  });
}
