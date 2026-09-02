
import type { FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../lib/redis.js";
import { AppError } from "../lib/errors.js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export function rateLimit(keyPrefix: string) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const ip = req.ip;
    const key = `ratelimit:${keyPrefix}:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
      }
      if (count > MAX_REQUESTS) {
        throw new AppError(429, "RATE_LIMITED", "Too many requests, try again later");
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
    }
  };
}
