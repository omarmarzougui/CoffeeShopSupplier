import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

export async function requireAuth(req: FastifyRequest): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing bearer token");
  }
  req.user = verifyAccessToken(header.slice(7));
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
