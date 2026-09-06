import { describe, expect, it, vi } from "vitest";

import { encodeEnvelope } from "./envelope.ts";
import { getOrSetWithBackend, type CacheBackend } from "./get-or-set.ts";
import { createMemoryCache } from "./memory-cache.ts";

describe("createMemoryCache", () => {
  it("round-trips values under a namespaced key", async () => {
    const cache = createMemoryCache("local");
    const key = { namespace: "session", version: 1, key: "user-1", ttlSeconds: 60 };

    await cache.set(key, { ok: true });
    await expect(cache.get<{ ok: boolean }>(key)).resolves.toEqual({ ok: true });

    await cache.del(key);
    await expect(cache.get(key)).resolves.toBeUndefined();
    await cache.close();
  });

  it("atomically sets a value only once", async () => {
    const cache = createMemoryCache("local");
    const key = { namespace: "claim", version: 1, key: "request-1", ttlSeconds: 60 };

    const claims = await Promise.all([
      cache.setIfAbsent(key, "first"),
      cache.setIfAbsent(key, "second"),
    ]);

    expect(claims).toEqual([true, false]);
    await expect(cache.get<string>(key)).resolves.toBe("first");
    await cache.close();
  });

  it("getOrSet computes once on a miss", async () => {
    const cache = createMemoryCache("local");
    const factory = vi.fn(() => Promise.resolve("value"));

    const first = await cache.getOrSet({
      namespace: "x",
      version: 1,
      key: "k",
      ttlSeconds: 30,
      factory,
    });
    const second = await cache.getOrSet({
      namespace: "x",
      version: 1,
      key: "k",
      ttlSeconds: 30,
      factory,
    });

    expect(first).toBe("value");
    expect(second).toBe("value");
    expect(factory).toHaveBeenCalledOnce();
    await cache.close();
  });
});

describe("getOrSetWithBackend stampede", () => {
  it("returns stale value when lock is held", async () => {
    const store = new Map<string, string>();
    store.set("k", encodeEnvelope("stale", -1)); // soft-expired

    const backend: CacheBackend = {
      read(key) {
        return Promise.resolve(store.get(key) ?? null);
      },
      write(key, value) {
        store.set(key, value);
        return Promise.resolve();
      },
      tryLock() {
        return Promise.resolve(false);
      },
      unlock() {
        return Promise.resolve();
      },
      sleep() {
        return Promise.resolve();
      },
    };

    const factory = vi.fn(() => Promise.resolve("fresh"));
    const value = await getOrSetWithBackend(backend, "k", {
      namespace: "n",
      version: 1,
      key: "k",
      ttlSeconds: 60,
      softTtlSeconds: 1,
      factory,
    });

    expect(value).toBe("stale");
    expect(factory).not.toHaveBeenCalled();
  });

  it("recomputes when the lock is acquired on soft-expired data", async () => {
    const store = new Map<string, string>();
    store.set("k", encodeEnvelope("stale", -1));

    const backend: CacheBackend = {
      read(key) {
        return Promise.resolve(store.get(key) ?? null);
      },
      write(key, value) {
        store.set(key, value);
        return Promise.resolve();
      },
      tryLock() {
        return Promise.resolve(true);
      },
      unlock() {
        return Promise.resolve();
      },
      sleep() {
        return Promise.resolve();
      },
    };

    const value = await getOrSetWithBackend(backend, "k", {
      namespace: "n",
      version: 1,
      key: "k",
      ttlSeconds: 60,
      factory: () => Promise.resolve("fresh"),
    });

    expect(value).toBe("fresh");
    expect(store.get("k")).toContain("fresh");
  });

  it("increments a counter and restarts it after the TTL", async () => {
    vi.useFakeTimers();
    try {
      const cache = createMemoryCache("local");
      const key = { namespace: "counter", version: 1, key: "window-1", ttlSeconds: 60 };

      await expect(cache.incr(key)).resolves.toBe(1);
      await expect(cache.incr(key)).resolves.toBe(2);

      // The TTL is armed by the first increment only, so the counter expires a
      // fixed interval after it opened rather than sliding on every hit.
      vi.advanceTimersByTime(59_000);
      await expect(cache.incr(key)).resolves.toBe(3);
      vi.advanceTimersByTime(2000);
      await expect(cache.incr(key)).resolves.toBe(1);

      await cache.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it("counts every concurrent increment", async () => {
    const cache = createMemoryCache("local");
    const key = { namespace: "counter", version: 1, key: "concurrent", ttlSeconds: 60 };

    const counts = await Promise.all(Array.from({ length: 50 }, () => cache.incr(key)));

    expect(counts.toSorted((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    await cache.close();
  });

  it("keeps counters separate from envelope values", async () => {
    const cache = createMemoryCache("local");
    const key = { namespace: "counter", version: 1, key: "mixed", ttlSeconds: 60 };

    await cache.incr(key);
    // Counters are stored as plain integers, so the envelope reader skips them.
    await expect(cache.get(key)).resolves.toBeUndefined();

    await cache.set(key, { not: "a counter" });
    expect(() => cache.incr(key)).toThrow(/non-integer/);
    await cache.close();
  });
});
