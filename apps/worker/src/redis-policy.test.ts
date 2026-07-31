import { describe, expect, it } from "vitest";

import { assertRedisNoEviction } from "./redis-policy.ts";

describe("assertRedisNoEviction", () => {
  it("is exported for startup use", () => {
    expect(typeof assertRedisNoEviction).toBe("function");
  });
});
