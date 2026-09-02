import { db } from "./db.js";
import { checkRedis } from "./redis.js";
import { checkMeilisearch } from "./search.js";

async function checkDb(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export interface HealthStatus {
  db: "up" | "down";
  redis: "up" | "down";
  search: "up" | "down";
}

export async function checkDependencies(): Promise<HealthStatus> {
  const [dbUp, redisUp, searchUp] = await Promise.all([
    checkDb(),
    checkRedis(),
    checkMeilisearch(),
  ]);
  return {
    db: dbUp ? "up" : "down",
    redis: redisUp ? "up" : "down",
    search: searchUp ? "up" : "down",
  };
}
