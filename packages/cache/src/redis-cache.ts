/**
 * Redis-backed {@link Cache} via ioredis.
 */

import { Redis } from "ioredis";

import { decodeEnvelope, encodeEnvelope } from "./envelope.ts";
import { getOrSetWithBackend, type CacheBackend } from "./get-or-set.ts";
import { buildCacheKey } from "./key.ts";
import type {
  Cache,
  CacheGetOrSetOptions,
  CacheKeyInput,
  CacheSetOptions,
  CreateCacheOptions,
} from "./types.ts";

export function createCache(options: CreateCacheOptions): Cache {
  const redis = new Redis(options.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  const backend: CacheBackend = {
    async read(key) {
      return redis.get(key);
    },
    async write(key, value, ttlSeconds) {
      await redis.set(key, value, "EX", ttlSeconds);
    },
    async tryLock(lockKey, ttlSeconds) {
      const result = await redis.set(lockKey, "1", "EX", ttlSeconds, "NX");
      return result === "OK";
    },
    async unlock(lockKey) {
      await redis.del(lockKey);
    },
    async sleep(ms) {
      await new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    },
  };

  return {
    async get<T>(input: CacheKeyInput): Promise<T | undefined> {
      const key = buildCacheKey(options.appEnv, input);
      const raw = await backend.read(key);
      if (raw === null) {
        return undefined;
      }

      const envelope = decodeEnvelope<T>(raw);
      if (envelope === undefined) {
        return undefined;
      }

      return envelope.value;
    },
    set(input: CacheSetOptions, value: unknown): Promise<void> {
      const key = buildCacheKey(options.appEnv, input);
      const softTtl = Math.max(1, Math.floor(input.ttlSeconds / 2));
      return backend.write(key, encodeEnvelope(value, softTtl), input.ttlSeconds);
    },
    async del(input: CacheKeyInput): Promise<void> {
      await redis.del(buildCacheKey(options.appEnv, input));
    },
    getOrSet<T>(input: CacheGetOrSetOptions<T>): Promise<T> {
      return getOrSetWithBackend(backend, buildCacheKey(options.appEnv, input), input);
    },
    close(): Promise<void> {
      redis.disconnect();
      return Promise.resolve();
    },
  };
}
