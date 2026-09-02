import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  loginUser,
  logoutUser,
  refreshTokens,
  registerUser,
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../services/auth-service.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/register", { preHandler: rateLimit("register") }, async (req) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return registerUser(parsed.data);
  });

  app.post("/api/v1/auth/login", { preHandler: rateLimit("login") }, async (req) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return loginUser(parsed.data);
  });

  app.post("/api/v1/auth/refresh", { preHandler: rateLimit("refresh") }, async (req) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return refreshTokens(parsed.data.refreshToken);
  });

  app.post("/api/v1/auth/logout", { preHandler: requireAuth }, async (req) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    await logoutUser(parsed.data.refreshToken);
    return { success: true };
  });
}
