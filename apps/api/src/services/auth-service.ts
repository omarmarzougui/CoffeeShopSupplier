import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";
import { signAccessToken } from "../lib/tokens.js";
import { sendEmail } from "../lib/email.js";
import type { Role, User } from "@prisma/client";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 10;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["buyer", "supplier"]),
  businessName: z.string().min(2).max(200),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  vatId: z.string().max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(user: Pick<User, "id" | "role">) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId: user.id, expiresAt },
  });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
}

export async function registerUser(input: RegisterInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
      businessName: input.businessName,
      phone: input.phone,
      address: input.address,
      vatId: input.vatId,
    },
  });

  await sendEmail(
    user.email,
    "Verify your email",
    `<p>Welcome to CoffeeShopSupplier! Verify your account:</p><p><code>${verificationToken}</code></p>`,
  );

  const tokens = await issueTokens(user);
  return {
    user: { id: user.id, email: user.email, role: user.role, businessName: user.businessName },
    ...tokens,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  const tokens = await issueTokens(user);
  return {
    user: { id: user.id, email: user.email, role: user.role, businessName: user.businessName },
    ...tokens,
  };
}

export async function refreshTokens(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await db.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    if (stored && !stored.revokedAt) {
      await db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    }
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token invalid or expired");
  }

  const reused = await db.refreshToken.findFirst({
    where: { userId: stored.userId, revokedAt: { not: null } },
  });

  await db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  if (reused) {
    await db.refreshToken.updateMany({
      where: { userId: stored.userId },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, "TOKEN_REUSE_DETECTED", "Session compromised, please login again");
  }

  const user = await db.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "User no longer exists");
  }

  const tokens = await issueTokens(user);
  return tokens;
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await db.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export type SafeUser = { id: string; email: string; role: Role; businessName: string };
