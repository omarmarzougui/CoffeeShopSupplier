import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../schemas/product-schemas.js";
import {
  archiveProduct,
  createProduct,
  updateProduct,
} from "../services/product-service.js";

const supplierOnly = requireRole("supplier");

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/products", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return createProduct(req.user!.sub, parsed.data);
  });

  app.patch("/api/v1/products/:id", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return updateProduct(req.user!.sub, id, parsed.data);
  });

  app.delete("/api/v1/products/:id", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const product = await archiveProduct(req.user!.sub, id);
    return { success: true, id: product.id, archived: true };
  });
}
