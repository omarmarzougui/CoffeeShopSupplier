import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { listCategories } from "../services/category-service.js";

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/categories", { preHandler: [requireAuth] }, async () => {
    return listCategories();
  });
}
