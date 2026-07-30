/**
 * Shared getOrSet logic for Redis and in-memory caches.
 *
 * Stampede protection: when the soft TTL has elapsed, only one caller holds a
 * short lock and recomputes; others return the stale value (or wait briefly).
 */

import { decodeEnvelope, encodeEnvelope, isFresh } from "./envelope.ts";
import type { CacheGetOrSetOptions } from "./types.ts";

export type CacheBackend = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string, ttlSeconds: number): Promise<void>;
  tryLock(lockKey: string, ttlSeconds: number): Promise<boolean>;
  unlock(lockKey: string): Promise<void>;
  sleep(ms: number): Promise<void>;
};

export async function getOrSetWithBackend<T>(
  backend: CacheBackend,
  redisKey: string,
  input: CacheGetOrSetOptions<T>,
): Promise<T> {
  if (input.ttlSeconds <= 0) {
    throw new Error("ttlSeconds must be positive");
  }

  const softTtlSeconds = input.softTtlSeconds ?? Math.max(1, Math.floor(input.ttlSeconds / 2));
  const lockSeconds = input.lockSeconds ?? 5;
  const lockKey = `${redisKey}:lock`;

  const raw = await backend.read(redisKey);
  if (raw !== null) {
    const envelope = decodeEnvelope<T>(raw);
    if (envelope !== undefined) {
      if (isFresh(envelope)) {
        return envelope.value;
      }

      const locked = await backend.tryLock(lockKey, lockSeconds);
      if (!locked) {
        return envelope.value;
      }

      try {
        return await recompute(backend, redisKey, input, softTtlSeconds);
      } finally {
        await backend.unlock(lockKey);
      }
    }
  }

  const locked = await backend.tryLock(lockKey, lockSeconds);
  if (!locked) {
    // Another worker is computing — brief wait then re-read.
    await backend.sleep(50);
    const retry = await backend.read(redisKey);
    if (retry !== null) {
      const envelope = decodeEnvelope<T>(retry);
      if (envelope !== undefined) {
        return envelope.value;
      }
    }

    return input.factory();
  }

  try {
    return await recompute(backend, redisKey, input, softTtlSeconds);
  } finally {
    await backend.unlock(lockKey);
  }
}

async function recompute<T>(
  backend: CacheBackend,
  redisKey: string,
  input: CacheGetOrSetOptions<T>,
  softTtlSeconds: number,
): Promise<T> {
  const value = await input.factory();
  await backend.write(redisKey, encodeEnvelope(value, softTtlSeconds), input.ttlSeconds);
  return value;
}
