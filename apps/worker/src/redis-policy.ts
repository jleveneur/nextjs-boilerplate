/**
 * BullMQ requires Redis `maxmemory-policy: noeviction`. An evicting Redis
 * silently drops jobs — fail fast at startup rather than debug lost work later.
 */

import { Redis } from "ioredis";

function parseMaxmemoryPolicy(result: unknown): string | undefined {
  if (!Array.isArray(result) || result.length < 2) {
    return undefined;
  }
  const value: unknown = result[1];
  return typeof value === "string" ? value : undefined;
}

export async function assertRedisNoEviction(redisUrl: string): Promise<void> {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const result: unknown = await redis.config("GET", "maxmemory-policy");
    const policy = parseMaxmemoryPolicy(result);
    if (policy !== "noeviction") {
      throw new Error(
        `Redis maxmemory-policy must be "noeviction" (BullMQ); got ${String(policy)}`,
      );
    }
  } finally {
    redis.disconnect();
  }
}
