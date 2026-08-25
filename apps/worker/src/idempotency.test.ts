import { describe, expect, it } from "vitest";

import {
  beginJobIdempotency,
  completeJobIdempotency,
  releaseJobIdempotency,
  type JobIdempotencyRedis,
} from "./idempotency.ts";

class InMemoryRedis implements JobIdempotencyRedis {
  readonly #values = new Map<string, string>();

  set(
    key: string,
    value: string,
    _expiryMode: "EX",
    _ttlSeconds: number,
    _setMode: "NX",
  ): Promise<"OK" | null> {
    if (this.#values.has(key)) {
      return Promise.resolve(null);
    }
    this.#values.set(key, value);
    return Promise.resolve("OK");
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.#values.get(key) ?? null);
  }

  eval(
    _script: string,
    _numberOfKeys: 1,
    key: string,
    ...args: readonly string[]
  ): Promise<unknown> {
    const [token, replacement] = args;
    if (token === undefined || this.#values.get(key) !== token) {
      return Promise.resolve(0);
    }
    if (replacement === undefined) {
      this.#values.delete(key);
    } else {
      this.#values.set(key, replacement);
    }
    return Promise.resolve(1);
  }
}

describe("job idempotency leases", () => {
  it("allows a failed claim to be released and reclaimed", async () => {
    const redis = new InMemoryRedis();
    const firstLease = await beginJobIdempotency(redis, "failed-job");
    if (firstLease.status !== "claimed") {
      throw new Error("expected first attempt to claim the lease");
    }

    await releaseJobIdempotency(redis, "failed-job", firstLease.token);

    const retryLease = await beginJobIdempotency(redis, "failed-job");
    expect(retryLease.status).toBe("claimed");
  });

  it("reports completed after a claimed job completes", async () => {
    const redis = new InMemoryRedis();
    const lease = await beginJobIdempotency(redis, "completed-job");
    if (lease.status !== "claimed") {
      throw new Error("expected first attempt to claim the lease");
    }

    await completeJobIdempotency(redis, "completed-job", lease.token);

    await expect(beginJobIdempotency(redis, "completed-job")).resolves.toEqual({
      status: "completed",
    });
  });

  it("reports an in-progress concurrent claim", async () => {
    const redis = new InMemoryRedis();

    const [firstLease, concurrentLease] = await Promise.all([
      beginJobIdempotency(redis, "concurrent-job"),
      beginJobIdempotency(redis, "concurrent-job"),
    ]);

    expect(firstLease.status).toBe("claimed");
    expect(concurrentLease).toEqual({ status: "in_progress" });
  });
});
