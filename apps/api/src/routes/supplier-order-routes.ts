import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listOrdersQuerySchema } from "../schemas/order-schemas.js";
import {
  confirmOrder,
  deliverOrder,
  dispatchOrder,
  getIncomingOrder,
  listIncomingOrders,
} from "../services/supplier-order-service.js";

const supplierOnly = requireRole("supplier");

export async function supplierOrderRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/supplier/orders", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid query", parsed.error.flatten());
    }
    return listIncomingOrders(req.user!.sub, parsed.data);
  });

  app.get("/api/v1/supplier/orders/:id", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return getIncomingOrder(req.user!.sub, id);
  });

  app.patch("/api/v1/supplier/orders/:id/confirm", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return confirmOrder(req.user!.sub, id);
  });

  app.patch("/api/v1/supplier/orders/:id/dispatch", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return dispatchOrder(req.user!.sub, id);
  });

  app.patch("/api/v1/supplier/orders/:id/deliver", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    return deliverOrder(req.user!.sub, id);
  });
}
