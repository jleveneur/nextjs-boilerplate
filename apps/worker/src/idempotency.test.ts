import type { Redis } from "ioredis";
import { describe, expect, it, vi } from "vitest";

import { claimJobIdempotency } from "./idempotency.ts";

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24 * 7;

function asRedis(value: unknown): Redis {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- focused Redis test double
  return value as Redis;
}

describe("claimJobIdempotency", () => {
  it("atomically claims a namespaced key for seven days", async () => {
    const set = vi.fn(() => Promise.resolve("OK"));
    const redis = asRedis({ set });

    await expect(claimJobIdempotency(redis, "email-123")).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith(
      "job:idempotency:email-123",
      "1",
      "EX",
      IDEMPOTENCY_TTL_SECONDS,
      "NX",
    );
  });

  it("keeps later attempts excluded after the first claim", async () => {
    let claimed = false;
    const set = vi.fn(() => {
      if (claimed) {
        return Promise.resolve(null);
      }
      claimed = true;
      return Promise.resolve("OK");
    });
    const redis = asRedis({ set });

    await expect(claimJobIdempotency(redis, "same-job")).resolves.toBe(true);
    await expect(claimJobIdempotency(redis, "same-job")).resolves.toBe(false);
    expect(set).toHaveBeenCalledTimes(2);
  });
});
