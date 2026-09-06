import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCache } from "./redis-cache.ts";
import type { Cache } from "./types.ts";

function requireRedisUrl(): string {
  const url = process.env["REDIS_URL"];
  if (url === undefined || url === "") {
    throw new Error("REDIS_URL is required for @repo/cache integration tests");
  }

  return url;
}

describe("createCache (redis)", () => {
  let cache: Cache;

  beforeAll(() => {
    cache = createCache({ redisUrl: requireRedisUrl(), appEnv: "test" });
  });

  afterAll(async () => {
    await cache.close();
  });

  it("sets and gets a value", async () => {
    const key = {
      namespace: "integration",
      version: 1,
      key: `roundtrip-${Date.now()}`,
      organizationId: "01900000-0000-7000-8000-000000000010",
      ttlSeconds: 30,
    };

    await cache.set(key, { n: 42 });
    await expect(cache.get<{ n: number }>(key)).resolves.toEqual({ n: 42 });
    await cache.del(key);
    await expect(cache.get(key)).resolves.toBeUndefined();
  });

  it("atomically sets a value only once", async () => {
    const key = {
      namespace: "integration-claim",
      version: 1,
      key: `claim-${Date.now()}`,
      ttlSeconds: 30,
    };

    const claims = await Promise.all([
      cache.setIfAbsent(key, "first"),
      cache.setIfAbsent(key, "second"),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    await expect(cache.get<string>(key)).resolves.toBe(claims[0] ? "first" : "second");
    await cache.del(key);
  });

  it("increments atomically and expires the counter", async () => {
    const key = {
      namespace: "integration-counter",
      version: 1,
      key: `counter-${Date.now()}`,
      ttlSeconds: 30,
    };

    const counts = await Promise.all(Array.from({ length: 25 }, () => cache.incr(key)));

    // Every caller must observe a distinct value: the Lua `INCR` is what makes
    // a fixed-window limiter hold across concurrent requests and replicas.
    expect(counts.toSorted((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));

    // Counters are integers, not envelopes, so `get` cannot read them.
    await expect(cache.get(key)).resolves.toBeUndefined();
    await cache.del(key);
    await expect(cache.incr(key)).resolves.toBe(1);
    await cache.del(key);
  });
});
