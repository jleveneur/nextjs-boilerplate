/**
 * Job-handler idempotency via Redis SET NX.
 *
 * Returns true when this attempt owns the key (first time); false when a prior
 * successful run already claimed it.
 */

import type { Redis } from "ioredis";

const TTL_SECONDS = 60 * 60 * 24 * 7;

export async function claimJobIdempotency(redis: Redis, idempotencyKey: string): Promise<boolean> {
  const result = await redis.set(`job:idempotency:${idempotencyKey}`, "1", "EX", TTL_SECONDS, "NX");
  return result === "OK";
}
