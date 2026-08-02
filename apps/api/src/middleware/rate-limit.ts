import { createHash } from "node:crypto";

import { RateLimitError } from "@repo/errors";
import type { MiddlewareHandler } from "hono";

import type { ApiEnv } from "../app.ts";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 60;

type WindowState = {
  count: number;
  windowStartMs: number;
};

function keyFingerprint(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 32);
}

/** Per-API-key fixed window limiter backed by `@repo/cache`. */
export const rateLimitMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const apiKey = c.get("apiKey");
  const cache = c.get("container").cache;
  const fingerprint = keyFingerprint(apiKey);
  const now = Date.now();
  const windowStartMs = now - (now % (WINDOW_SECONDS * 1000));

  // `buildCacheKey` forbids `:` inside the `key` segment (it is the delimiter).
  const cacheKey = {
    namespace: "api-rate-limit",
    version: 1,
    key: `${fingerprint}-${String(windowStartMs)}`,
  };

  const existing = await cache.get<WindowState>(cacheKey);
  const state: WindowState =
    existing === undefined || existing.windowStartMs !== windowStartMs
      ? { count: 0, windowStartMs }
      : existing;

  state.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - state.count);
  const resetSeconds = Math.ceil((windowStartMs + WINDOW_SECONDS * 1000 - now) / 1000);

  c.header("RateLimit-Limit", String(MAX_REQUESTS));
  c.header("RateLimit-Remaining", String(remaining));
  c.header("RateLimit-Reset", String(resetSeconds));

  if (state.count > MAX_REQUESTS) {
    c.header("Retry-After", String(resetSeconds));
    throw new RateLimitError({
      message: "Rate limit exceeded",
      retryAfterSeconds: resetSeconds,
    });
  }

  await cache.set({ ...cacheKey, ttlSeconds: WINDOW_SECONDS + 1 }, state);
  await next();
};
