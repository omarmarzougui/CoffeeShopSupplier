import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { checkDependencies } from "./lib/health.js";
import { redis } from "./lib/redis.js";
import { ensureProductIndex } from "./lib/search.js";
import { authRoutes } from "./routes/auth-routes.js";
import { categoryRoutes } from "./routes/category-routes.js";
import { orderRoutes } from "./routes/order-routes.js";
import { productRoutes } from "./routes/product-routes.js";
import { supplierOrderRoutes } from "./routes/supplier-order-routes.js";
import { supplierRoutes } from "./routes/supplier-routes.js";
import { registerErrorHandler } from "./middleware/error-handler.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN?.split(",") ?? true,
  });

  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok", service: "api" }));

  app.get("/health/deps", async (_req, reply) => {
    const deps = await checkDependencies();
    const allUp = Object.values(deps).every((s) => s === "up");
    return reply.code(allUp ? 200 : 503).send({ status: allUp ? "ok" : "degraded", deps });
  });

  try {
    await ensureProductIndex();
  } catch {
    // Meilisearch unavailable at startup — sync will fail open on demand
  }

  await app.register(authRoutes);
  await app.register(categoryRoutes);
  await app.register(supplierRoutes);
  await app.register(productRoutes);
  await app.register(orderRoutes);
  await app.register(supplierOrderRoutes);

  app.addHook("onClose", async () => {
    if (redis.status === "ready" || redis.status === "connecting") {
      redis.disconnect();
    }
  });

  return app;
}
