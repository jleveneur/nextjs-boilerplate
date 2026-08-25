/**
 * In-memory {@link Cache} for unit tests.
 *
 * Real enough to exercise key building, TTL, and stampede behaviour without Redis.
 */

import { decodeEnvelope, encodeEnvelope } from "./envelope.ts";
import { getOrSetWithBackend, type CacheBackend } from "./get-or-set.ts";
import { buildCacheKey } from "./key.ts";
import type { Cache, CacheGetOrSetOptions, CacheKeyInput, CacheSetOptions } from "./types.ts";

type Entry = { value: string; expiresAt: number };

export function createMemoryCache(appEnv: string): Cache {
  const store = new Map<string, Entry>();
  const locks = new Set<string>();

  const backend: CacheBackend = {
    read(key) {
      const entry = store.get(key);
      if (entry === undefined) {
        return Promise.resolve(null);
      }

      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return Promise.resolve(null);
      }

      return Promise.resolve(entry.value);
    },
    write(key, value, ttlSeconds) {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return Promise.resolve();
    },
    tryLock(lockKey) {
      if (locks.has(lockKey)) {
        return Promise.resolve(false);
      }

      locks.add(lockKey);
      return Promise.resolve(true);
    },
    unlock(lockKey) {
      locks.delete(lockKey);
      return Promise.resolve();
    },
    sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    },
  };

  return {
    async get<T>(input: CacheKeyInput): Promise<T | undefined> {
      const key = buildCacheKey(appEnv, input);
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
      const key = buildCacheKey(appEnv, input);
      const softTtl = Math.max(1, Math.floor(input.ttlSeconds / 2));
      return backend.write(key, encodeEnvelope(value, softTtl), input.ttlSeconds);
    },
    setIfAbsent(input: CacheSetOptions, value: unknown): Promise<boolean> {
      const key = buildCacheKey(appEnv, input);
      const existing = store.get(key);
      if (existing !== undefined && existing.expiresAt > Date.now()) {
        return Promise.resolve(false);
      }

      const softTtl = Math.max(1, Math.floor(input.ttlSeconds / 2));
      store.set(key, {
        value: encodeEnvelope(value, softTtl),
        expiresAt: Date.now() + input.ttlSeconds * 1000,
      });
      return Promise.resolve(true);
    },
    del(input: CacheKeyInput): Promise<void> {
      store.delete(buildCacheKey(appEnv, input));
      return Promise.resolve();
    },
    getOrSet<T>(input: CacheGetOrSetOptions<T>): Promise<T> {
      return getOrSetWithBackend(backend, buildCacheKey(appEnv, input), input);
    },
    close(): Promise<void> {
      store.clear();
      locks.clear();
      return Promise.resolve();
    },
  };
}
