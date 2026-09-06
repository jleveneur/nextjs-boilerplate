import { createHash } from "node:crypto";

import type { Context, MiddlewareHandler } from "hono";

import { RateLimitError } from "@repo/errors";

import type { ApiEnv } from "../api-env.ts";

const WINDOW_SECONDS = 60;

/** Per-key quota: the documented `/v1` budget for an authenticated caller. */
const API_KEY_MAX_REQUESTS = 60;

/**
 * Per-IP ceiling, applied before the key is resolved.
 *
 * Deliberately well above the per-key quota: this is an abuse ceiling that
 * bounds work done for *unauthenticated* requests, not a business quota. One
 * customer running several keys from one egress IP must not trip it.
 */
const CLIENT_MAX_REQUESTS = 300;

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Client address for the anonymous bucket.
 *
 * Assumes exactly one trusted reverse proxy in front of the API (the shipped
 * Compose topology). That proxy *appends* the peer address it saw, so the last
 * `X-Forwarded-For` entry is the only one a client cannot forge — reading the
 * first would let any caller mint unlimited buckets by sending its own header.
 * Adopters terminating TLS behind more hops must widen this accordingly.
 */
function clientBucket(c: Context<ApiEnv>): string {
  const forwarded = c.req.header("x-forwarded-for");
  const hops = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  const nearest = hops?.at(-1);
  if (nearest !== undefined) {
    return nearest;
  }

  // No proxy in front (direct exposure, local runs). Fall back to a shared
  // bucket rather than no limit at all.
  return "unknown";
}

type RateLimiterOptions = {
  /** Cache namespace — separates the counters of independent limiters. */
  namespace: string;
  maxRequests: number;
  /** Identity this limiter counts against. Hashed before it reaches Redis. */
  bucket: (c: Context<ApiEnv>) => string;
};

/**
 * Fixed-window limiter backed by an atomic `@repo/cache` counter.
 *
 * The window start is folded into the cache key, so a window expires with its
 * own counter and no separate reset bookkeeping is needed. Counting through
 * `incr` rather than get-modify-set is what makes the limit hold when requests
 * overlap or more than one API replica is serving them.
 */
function createRateLimiter(options: RateLimiterOptions): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const cache = c.get("container").cache;
    const now = Date.now();
    const windowStartMs = now - (now % (WINDOW_SECONDS * 1000));

    // `buildCacheKey` forbids `:` inside the `key` segment (it is the delimiter).
    const cacheKey = {
      namespace: options.namespace,
      version: 1,
      key: `${fingerprint(options.bucket(c))}-${String(windowStartMs)}`,
      ttlSeconds: WINDOW_SECONDS + 1,
    };

    const count = await cache.incr(cacheKey);
    const remaining = Math.max(0, options.maxRequests - count);
    const resetSeconds = Math.ceil((windowStartMs + WINDOW_SECONDS * 1000 - now) / 1000);

    c.header("RateLimit-Limit", String(options.maxRequests));
    c.header("RateLimit-Remaining", String(remaining));
    c.header("RateLimit-Reset", String(resetSeconds));

    if (count > options.maxRequests) {
      c.header("Retry-After", String(resetSeconds));
      throw new RateLimitError({
        message: "Rate limit exceeded",
        retryAfterSeconds: resetSeconds,
      });
    }

    await next();
  };
}

/**
 * Per-IP limiter, mounted **before** API-key authentication.
 *
 * Everything after this point costs a key lookup, so a limiter that could only
 * run post-auth would leave invalid-key traffic unmetered — the cheap path for
 * both brute force and plain saturation.
 */
export const clientRateLimitMiddleware = createRateLimiter({
  namespace: "api-rate-limit-client",
  maxRequests: CLIENT_MAX_REQUESTS,
  bucket: clientBucket,
});

/** Per-API-key limiter. Runs after auth; its headers are the ones clients see. */
export const rateLimitMiddleware = createRateLimiter({
  namespace: "api-rate-limit",
  maxRequests: API_KEY_MAX_REQUESTS,
  bucket: (c) => c.get("apiKey"),
});
