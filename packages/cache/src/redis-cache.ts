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

/**
 * `INCR` plus a first-write `EXPIRE`, as one round trip that cannot interleave.
 *
 * Doing this as two commands from the client would leave the key without a TTL
 * whenever the process dies between them, turning a rate-limit window into a
 * permanent block.
 */
const INCR_WITH_TTL = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

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
    async setIfAbsent(input: CacheSetOptions, value: unknown): Promise<boolean> {
      const key = buildCacheKey(options.appEnv, input);
      const softTtl = Math.max(1, Math.floor(input.ttlSeconds / 2));
      const result = await redis.set(
        key,
        encodeEnvelope(value, softTtl),
        "EX",
        input.ttlSeconds,
        "NX",
      );
      return result === "OK";
    },
    async incr(input: CacheSetOptions): Promise<number> {
      const key = buildCacheKey(options.appEnv, input);
      const result: unknown = await redis.eval(INCR_WITH_TTL, 1, key, String(input.ttlSeconds));

      if (typeof result !== "number") {
        throw new Error(`cache incr expected a number from Redis, got ${typeof result}`);
      }

      return result;
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
