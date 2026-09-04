import type { FastifyInstance, FastifyReply } from "fastify";
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
  verifyEmail,
  verifySchema,
} from "../services/auth-service.js";

const COOKIE_AUTH = process.env.COOKIE_AUTH_ENABLED === "true";
const REFRESH_TTL_DAYS = 30;

function setAuthCookies(reply: FastifyReply, tokens: { accessToken: string; refreshToken: string; expiresIn: number }) {
  if (!COOKIE_AUTH) return;
  const secure = process.env.NODE_ENV === "production";
  reply
    .setCookie("access_token", tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expiresIn,
    })
    .setCookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/v1/auth/refresh",
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
    });
}

function clearAuthCookies(reply: FastifyReply) {
  if (!COOKIE_AUTH) return;
  const secure = process.env.NODE_ENV === "production";
  reply
    .clearCookie("access_token", { path: "/" })
    .clearCookie("refresh_token", { path: "/api/v1/auth/refresh" });
  void secure;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/register", {
    preHandler: rateLimit("register"),
  }, async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    const result = await registerUser(parsed.data);
    setAuthCookies(reply, result);
    return result;
  });

  app.post("/api/v1/auth/login", {
    preHandler: rateLimit("login"),
  }, async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    const result = await loginUser(parsed.data);
    setAuthCookies(reply, result);
    return result;
  });

  app.post("/api/v1/auth/refresh", {
    preHandler: rateLimit("refresh"),
  }, async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    const result = await refreshTokens(parsed.data.refreshToken);
    setAuthCookies(reply, result);
    return result;
  });

  app.post("/api/v1/auth/verify", {
    preHandler: rateLimit("verify"),
  }, async (req) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    return verifyEmail(parsed.data);
  });

  app.post("/api/v1/auth/logout", {
    preHandler: requireAuth,
  }, async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", parsed.error.flatten());
    }
    await logoutUser(parsed.data.refreshToken);
    clearAuthCookies(reply);
    return { success: true };
  });
}
