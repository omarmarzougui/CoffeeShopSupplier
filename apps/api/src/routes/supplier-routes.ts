import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { getSupplierProfile } from "../services/supplier-service.js";

export async function supplierRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/suppliers/:id", { preHandler: [requireAuth] }, async (req) => {
    const { id } = req.params as { id: string };
    return getSupplierProfile(id);
  });
}
