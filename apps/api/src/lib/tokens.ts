import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { AppError } from "../lib/errors.js";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
}

const ACCESS_SECRET = () => process.env.JWT_ACCESS_SECRET ?? "dev-access-secret";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET());
    if (typeof decoded === "string" || !decoded.sub || !decoded.role) {
      throw new Error("malformed token");
    }
    return decoded as AccessTokenPayload;
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}
