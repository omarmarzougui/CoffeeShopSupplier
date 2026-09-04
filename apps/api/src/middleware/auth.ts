import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

const COOKIE_AUTH = process.env.COOKIE_AUTH_ENABLED === "true";
const ACCESS_COOKIE = "access_token";

function extractToken(req: FastifyRequest): string | null {
  // 1. Standard Authorization header (works in all modes)
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  // 2. Cookie-based auth (only when cookie mode is enabled)
  if (COOKIE_AUTH && req.cookies?.[ACCESS_COOKIE]) {
    return req.cookies[ACCESS_COOKIE];
  }

  return null;
}

export async function requireAuth(req: FastifyRequest): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Missing bearer token");
  }
  req.user = verifyAccessToken(token);
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", `Requires role: ${roles.join(" or ")}`);
    }
  };
}
