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
});
