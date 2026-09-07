import { beforeEach, describe, expect, it } from "vitest";

import type { Cache } from "@repo/cache";
import { createMemoryCache } from "@repo/cache/testing";

import { checkRateLimit, RPC_MAX_REQUESTS_PER_MINUTE } from "./rate-limit.ts";

const NAMESPACE = "test-rate-limit";

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://web.localhost/api/rpc", { method: "POST", headers });
}

describe("checkRateLimit", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = createMemoryCache("test");
  });

  async function hit(headers: Record<string, string> = {}, maxRequests = 3) {
    return checkRateLimit({ request: request(headers), cache, namespace: NAMESPACE, maxRequests });
  }

  it("allows requests up to the limit and denies the one after", async () => {
    const forwarded = { "x-forwarded-for": "203.0.113.7" };

    for (let i = 0; i < 3; i += 1) {
      const decision = await hit(forwarded);
      expect(decision.allowed, `request ${String(i + 1)}`).toBe(true);
    }

    await expect(hit(forwarded).then((d) => d.allowed)).resolves.toBe(false);
  });

  it("reports remaining quota and stops at zero rather than going negative", async () => {
    const forwarded = { "x-forwarded-for": "203.0.113.7" };

    expect((await hit(forwarded)).headers["RateLimit-Remaining"]).toBe("2");
    expect((await hit(forwarded)).headers["RateLimit-Remaining"]).toBe("1");
    expect((await hit(forwarded)).headers["RateLimit-Remaining"]).toBe("0");
    // Over the limit: a negative "remaining" is not a meaningful header value.
    expect((await hit(forwarded)).headers["RateLimit-Remaining"]).toBe("0");
  });

  it("counts each client address separately", async () => {
    for (let i = 0; i < 3; i += 1) {
      await hit({ "x-forwarded-for": "203.0.113.7" });
    }

    // The noisy client is exhausted; a different one must be unaffected.
    await expect(hit({ "x-forwarded-for": "203.0.113.8" }).then((d) => d.allowed)).resolves.toBe(
      true,
    );
  });

  it("buckets on the last X-Forwarded-For hop, not the first", async () => {
    // The trusted proxy appends the address it saw, so the last entry is the
    // only one a caller cannot forge. Reading the first would let any client
    // mint unlimited buckets by sending its own header.
    const forged = { "x-forwarded-for": "10.0.0.1, 203.0.113.7" };
    const alsoForged = { "x-forwarded-for": "10.9.9.9, 203.0.113.7" };

    for (let i = 0; i < 3; i += 1) {
      await hit(forged);
    }

    await expect(hit(alsoForged).then((d) => d.allowed)).resolves.toBe(false);
  });

  it("falls back to a shared bucket when no proxy header is present", async () => {
    // Direct exposure or a local run. A shared bucket beats no limit at all.
    for (let i = 0; i < 3; i += 1) {
      await hit();
    }

    await expect(hit().then((d) => d.allowed)).resolves.toBe(false);
  });

  it("keeps independent namespaces from sharing a counter", async () => {
    const forwarded = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 3; i += 1) {
      await hit(forwarded);
    }

    const other = await checkRateLimit({
      request: request(forwarded),
      cache,
      namespace: "a-different-limiter",
      maxRequests: 3,
    });
    expect(other.allowed).toBe(true);
  });

  it("never emits a negative or zero reset, so Retry-After is always usable", async () => {
    const decision = await hit({ "x-forwarded-for": "203.0.113.7" });

    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(60);
    expect(decision.headers["RateLimit-Reset"]).toBe(String(decision.retryAfterSeconds));
  });

  it("does not hash the client address into the response headers", async () => {
    const decision = await hit({ "x-forwarded-for": "203.0.113.7" });

    // The bucket is fingerprinted before it reaches Redis; nothing about the
    // caller's address should leak back out in a header.
    expect(Object.values(decision.headers).join(" ")).not.toContain("203.0.113.7");
    expect(decision.headers["RateLimit-Limit"]).toBe("3");
  });

  it("holds the ceiling under overlapping requests", async () => {
    // Regression for security finding P17-1: the original limiter did
    // get-modify-set, so concurrent requests all observed the same count and
    // the ceiling was not enforced under load or across replicas. Counting
    // must go through a single atomic `Cache.incr`.
    const forwarded = { "x-forwarded-for": "203.0.113.7" };
    const decisions = await Promise.all(Array.from({ length: 40 }, () => hit(forwarded, 10)));

    expect(decisions.filter((d) => d.allowed)).toHaveLength(10);
  });

  it("ships a documented default ceiling", () => {
    expect(RPC_MAX_REQUESTS_PER_MINUTE).toBe(300);
  });
});
