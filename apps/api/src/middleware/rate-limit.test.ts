import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Cache } from "@repo/cache";
import { createMemoryCache } from "@repo/cache/testing";
import { RateLimitError } from "@repo/errors";

import type { ApiEnv } from "../api-env.ts";
import type { AppContainer } from "../server/container.ts";
import { clientRateLimitMiddleware, rateLimitMiddleware } from "./rate-limit.ts";

const API_KEY_LIMIT = 60;
const CLIENT_LIMIT = 300;

function createTestApp(
  cache: Cache,
  middleware: typeof rateLimitMiddleware,
  apiKey = "test-api-key",
): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>();
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads cache
  const container = { cache } as AppContainer;

  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("apiKey", apiKey);
    await next();
  });
  app.use("*", middleware);
  app.onError((error, c) => {
    if (error instanceof RateLimitError) {
      return c.json({ message: error.message }, 429);
    }
    return c.json({ message: "Unexpected error" }, 500);
  });
  app.get("/thing", (c) => c.json({ ok: true }));

  return app;
}

describe("rateLimitMiddleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports the remaining budget on each request", async () => {
    const app = createTestApp(createMemoryCache("test"), rateLimitMiddleware);

    const first = await app.request("/thing");
    expect(first.status).toBe(200);
    expect(first.headers.get("RateLimit-Limit")).toBe(String(API_KEY_LIMIT));
    expect(first.headers.get("RateLimit-Remaining")).toBe(String(API_KEY_LIMIT - 1));
    // Window opened at :00, request is at :30 — half the window is left.
    expect(first.headers.get("RateLimit-Reset")).toBe("30");

    const second = await app.request("/thing");
    expect(second.headers.get("RateLimit-Remaining")).toBe(String(API_KEY_LIMIT - 2));
  });

  it("rejects once the window budget is spent", async () => {
    const app = createTestApp(createMemoryCache("test"), rateLimitMiddleware);

    for (let i = 0; i < API_KEY_LIMIT; i += 1) {
      const allowed = await app.request("/thing");
      expect(allowed.status).toBe(200);
    }

    const blocked = await app.request("/thing");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("Retry-After")).toBe("30");
  });

  /**
   * The regression this middleware was rewritten for. A get-modify-set limiter
   * lets concurrent requests read the same count and write it back, so the
   * budget is enforced once per *batch* rather than once per request.
   */
  it("counts every request when they overlap", async () => {
    const app = createTestApp(createMemoryCache("test"), rateLimitMiddleware);

    const responses = await Promise.all(
      Array.from({ length: API_KEY_LIMIT + 20 }, async () => app.request("/thing")),
    );

    const allowed = responses.filter((res) => res.status === 200);
    const blocked = responses.filter((res) => res.status === 429);
    expect(allowed).toHaveLength(API_KEY_LIMIT);
    expect(blocked).toHaveLength(20);
  });

  it("gives each API key its own budget", async () => {
    const cache = createMemoryCache("test");
    const first = createTestApp(cache, rateLimitMiddleware, "key-one");
    const second = createTestApp(cache, rateLimitMiddleware, "key-two");

    for (let i = 0; i < API_KEY_LIMIT; i += 1) {
      await first.request("/thing");
    }

    expect((await first.request("/thing")).status).toBe(429);
    expect((await second.request("/thing")).status).toBe(200);
  });

  it("starts a fresh budget in the next window", async () => {
    const app = createTestApp(createMemoryCache("test"), rateLimitMiddleware);

    for (let i = 0; i < API_KEY_LIMIT + 1; i += 1) {
      await app.request("/thing");
    }
    expect((await app.request("/thing")).status).toBe(429);

    vi.setSystemTime(new Date("2026-01-01T00:01:30.000Z"));
    expect((await app.request("/thing")).status).toBe(200);
  });
});

describe("clientRateLimitMiddleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buckets by the proxy-appended forwarded address", async () => {
    const cache = createMemoryCache("test");
    const app = createTestApp(cache, clientRateLimitMiddleware);

    const first = await app.request("/thing", {
      headers: { "x-forwarded-for": "203.0.113.7" },
    });
    expect(first.headers.get("RateLimit-Limit")).toBe(String(CLIENT_LIMIT));
    expect(first.headers.get("RateLimit-Remaining")).toBe(String(CLIENT_LIMIT - 1));

    const otherClient = await app.request("/thing", {
      headers: { "x-forwarded-for": "198.51.100.4" },
    });
    expect(otherClient.headers.get("RateLimit-Remaining")).toBe(String(CLIENT_LIMIT - 1));

    const sameClient = await app.request("/thing", {
      headers: { "x-forwarded-for": "203.0.113.7" },
    });
    expect(sameClient.headers.get("RateLimit-Remaining")).toBe(String(CLIENT_LIMIT - 2));
  });

  /**
   * A client can prepend entries to `X-Forwarded-For`, but the trusted proxy
   * appends the address it actually saw. Keying on the last entry is what stops
   * a caller from minting a fresh budget per request.
   */
  it("ignores client-supplied forwarded entries ahead of the proxy's", async () => {
    const app = createTestApp(createMemoryCache("test"), clientRateLimitMiddleware);

    const spoofed = await app.request("/thing", {
      headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.7" },
    });
    expect(spoofed.headers.get("RateLimit-Remaining")).toBe(String(CLIENT_LIMIT - 1));

    const rotatedSpoof = await app.request("/thing", {
      headers: { "x-forwarded-for": "2.2.2.2, 203.0.113.7" },
    });
    // Same real client, so the budget kept draining.
    expect(rotatedSpoof.headers.get("RateLimit-Remaining")).toBe(String(CLIENT_LIMIT - 2));
  });

  it("does not require an authenticated key", async () => {
    const app = new Hono<ApiEnv>();
    const cache = createMemoryCache("test");
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads cache
    const container = { cache } as AppContainer;

    app.use("*", async (c, next) => {
      c.set("container", container);
      await next();
    });
    app.use("*", clientRateLimitMiddleware);
    app.onError((error, c) =>
      c.json({ message: "err" }, error instanceof RateLimitError ? 429 : 500),
    );
    app.get("/thing", (c) => c.json({ ok: true }));

    const res = await app.request("/thing", {
      headers: { "x-forwarded-for": "203.0.113.7" },
    });
    expect(res.status).toBe(200);
  });
});
