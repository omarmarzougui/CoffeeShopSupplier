import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("./lib/db.js", () => ({ db: dbMock }));
vi.mock("./lib/email.js", () => ({ sendEmail: vi.fn() }));
vi.mock("./lib/redis.js", () => ({
  redis: { incr: vi.fn().mockResolvedValue(1), expire: vi.fn() },
  checkRedis: vi.fn(),
}));

const { buildApp } = await import("./app.js");

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

describe("POST /api/v1/auth/register", () => {
  it("registers and returns tokens", async () => {
    const app = await buildApp();
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...demoUser,
      ...data,
    }));
    dbMock.refreshToken.create.mockResolvedValue({});

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "buyer@shop.test",
        password: "password123",
        role: "buyer",
        businessName: "Demo Shop",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe("buyer@shop.test");
    expect(body.accessToken).toBeTruthy();
  });

  it("returns 400 for invalid payload", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "not-an-email", password: "x", role: "hacker" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for duplicate email", async () => {
    const app = await buildApp();
    dbMock.user.findUnique.mockResolvedValue(demoUser);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "buyer@shop.test",
        password: "password123",
        role: "buyer",
        businessName: "Demo Shop",
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("EMAIL_TAKEN");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("returns 401 on bad credentials with error envelope", async () => {
    const app = await buildApp();
    dbMock.user.findUnique.mockResolvedValue(demoUser);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "buyer@shop.test", password: "nope" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    });
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("requires authentication", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      payload: { refreshToken: "f".repeat(96) },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });
});
