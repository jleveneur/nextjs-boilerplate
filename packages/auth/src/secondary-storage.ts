/**
 * Better Auth secondary storage over Redis.
 *
 * Takes a Redis URL — does not import `@repo/cache` (same-layer ban).
 */

import { Redis } from "ioredis";

export type SecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  quit: () => Promise<void>;
};

export function createRedisSecondaryStorage(redisUrl: string): SecondaryStorage {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

  return {
    get(key) {
      return redis.get(key);
    },
    async set(key, value, ttl) {
      if (ttl === undefined) {
        await redis.set(key, value);
        return;
      }

      await redis.set(key, value, "EX", ttl);
    },
    async delete(key) {
      await redis.del(key);
    },
    quit() {
      return redis.quit().then(() => undefined);
    },
  };
}
