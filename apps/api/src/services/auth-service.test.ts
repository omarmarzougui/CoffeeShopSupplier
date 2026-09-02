import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const dbMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock("../lib/db.js", () => ({ db: dbMock }));
vi.mock("../lib/email.js", () => ({ sendEmail: vi.fn() }));

const { registerUser, loginUser, refreshTokens, logoutUser } = await import("./auth-service.js");

function sha(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const demoUser = {
  id: "user-1",
  email: "buyer@shop.test",
  passwordHash: bcrypt.hashSync("password123", 4),
  role: "buyer" as const,
  businessName: "Demo Shop",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerUser", () => {
  it("creates user and returns tokens", async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...demoUser,
      ...data,
    }));
    dbMock.refreshToken.create.mockResolvedValue({});

    const result = await registerUser({
      email: "buyer@shop.test",
      password: "password123",
      role: "buyer",
      businessName: "Demo Shop",
    });

    expect(result.user.email).toBe("buyer@shop.test");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toHaveLength(96);
    expect(dbMock.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) }),
    );
  });

  it("rejects duplicate email with 409", async () => {
    dbMock.user.findUnique.mockResolvedValue(demoUser);
    await expect(
      registerUser({
        email: "buyer@shop.test",
        password: "password123",
        role: "buyer",
        businessName: "Demo Shop",
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_TAKEN" });
  });
});

describe("loginUser", () => {
  it("returns tokens for valid credentials", async () => {
    dbMock.user.findUnique.mockResolvedValue(demoUser);
    dbMock.refreshToken.create.mockResolvedValue({});

    const result = await loginUser({ email: "buyer@shop.test", password: "password123" });
    expect(result.user.id).toBe("user-1");
    expect(result.accessToken).toBeTruthy();
  });

  it("rejects wrong password with 401", async () => {
    dbMock.user.findUnique.mockResolvedValue(demoUser);
    await expect(
      loginUser({ email: "buyer@shop.test", password: "wrong" }),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  it("rejects unknown email with 401", async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    await expect(
      loginUser({ email: "ghost@shop.test", password: "password123" }),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });
});

describe("refreshTokens rotation", () => {
  it("rotates token and returns new pair", async () => {
    const token = "a".repeat(96);
    dbMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 1000),
      revokedAt: null,
    });
    dbMock.refreshToken.findFirst.mockResolvedValue(null);
    dbMock.user.findUnique.mockResolvedValue(demoUser);
    dbMock.refreshToken.create.mockResolvedValue({});
    dbMock.refreshToken.update.mockResolvedValue({});

    const result = await refreshTokens(token);
    expect(result.refreshToken).not.toBe(token);
    expect(dbMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects unknown token", async () => {
    dbMock.refreshToken.findUnique.mockResolvedValue(null);
    await expect(refreshTokens("b".repeat(96))).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
    });
  });

  it("rejects expired token and marks it revoked", async () => {
    const token = "c".repeat(96);
    dbMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-2",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    });
    await expect(refreshTokens(token)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
    });
    expect(dbMock.refreshToken.update).toHaveBeenCalled();
  });

  it("detects reuse and revokes all user tokens", async () => {
    const token = "d".repeat(96);
    dbMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-3",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 1000),
      revokedAt: null,
    });
    dbMock.refreshToken.findFirst.mockResolvedValue({
      id: "rt-old",
      userId: "user-1",
      revokedAt: new Date(),
    });
    dbMock.refreshToken.update.mockResolvedValue({});
    dbMock.refreshToken.updateMany.mockResolvedValue({ count: 3 });

    await expect(refreshTokens(token)).rejects.toMatchObject({
      statusCode: 401,
      code: "TOKEN_REUSE_DETECTED",
    });
    expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("logoutUser", () => {
  it("revokes the given refresh token", async () => {
    dbMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    await logoutUser("e".repeat(96));
    expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: sha("e".repeat(96)), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
