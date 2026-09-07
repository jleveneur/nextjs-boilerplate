import { createHash } from "node:crypto";

import type { Cache } from "@repo/cache";

const WINDOW_SECONDS = 60;

/**
 * Per-IP ceiling for the RPC surface.
 *
 * This is an abuse ceiling that bounds work done for traffic that has not been
 * authenticated yet, not a business quota — session verification and tenant
 * resolution both cost a database round trip, so a limiter that ran only after
 * auth would leave the cheap path for brute force and saturation unmetered.
 * Set well above what a single interactive user generates: one customer behind
 * a shared egress IP must not trip it.
 */
export const RPC_MAX_REQUESTS_PER_MINUTE = 300;

export type RateLimitDecision = {
  allowed: boolean;
  /** `RateLimit-*` headers to merge into the response either way. */
  headers: Readonly<Record<string, string>>;
  retryAfterSeconds: number;
};

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Client address for the anonymous bucket.
 *
 * Assumes exactly one trusted reverse proxy in front of the app (the shipped
 * Compose topology). That proxy *appends* the peer address it saw, so the last
 * `X-Forwarded-For` entry is the only one a client cannot forge — reading the
 * first would let any caller mint unlimited buckets by sending its own header.
 * Adopters terminating TLS behind more hops must widen this accordingly.
 */
function clientBucket(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const nearest = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .at(-1);
  if (nearest !== undefined) {
    return nearest;
  }

  // No proxy in front (direct exposure, local runs). Fall back to a shared
  // bucket rather than no limit at all.
  return "unknown";
}

/**
 * Fixed-window limiter backed by an atomic `@repo/cache` counter.
 *
 * The window start is folded into the cache key, so a window expires with its
 * own counter and no separate reset bookkeeping is needed. Counting through
 * `incr` rather than get-modify-set is what makes the limit hold when requests
 * overlap or more than one replica is serving them.
 *
 * Returns a decision rather than throwing so the caller owns the response
 * shape — an oRPC route answers differently from a plain route handler.
 */
export async function checkRateLimit(options: {
  request: Request;
  /** Injected rather than read from the container, so this is testable. */
  cache: Cache;
  /** Cache namespace — separates the counters of independent limiters. */
  namespace: string;
  maxRequests: number;
}): Promise<RateLimitDecision> {
  const { cache } = options;
  const now = Date.now();
  const windowStartMs = now - (now % (WINDOW_SECONDS * 1000));

  // `buildCacheKey` forbids `:` inside the `key` segment (it is the delimiter).
  const count = await cache.incr({
    namespace: options.namespace,
    version: 1,
    key: `${fingerprint(clientBucket(options.request))}-${String(windowStartMs)}`,
    ttlSeconds: WINDOW_SECONDS + 1,
  });

  const remaining = Math.max(0, options.maxRequests - count);
  const resetSeconds = Math.ceil((windowStartMs + WINDOW_SECONDS * 1000 - now) / 1000);

  return {
    allowed: count <= options.maxRequests,
    headers: {
      "RateLimit-Limit": String(options.maxRequests),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(resetSeconds),
    },
    retryAfterSeconds: resetSeconds,
  };
}
