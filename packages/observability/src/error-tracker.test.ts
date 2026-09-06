import { describe, expect, it } from "vitest";

import { createNoopErrorTracker } from "./error-tracker.ts";

describe("createNoopErrorTracker", () => {
  it("swallows anything thrown at it", () => {
    const tracker = createNoopErrorTracker();

    // The boundary has already logged; a missing tracker must never be the
    // reason a request fails.
    expect(() => {
      tracker.capture(new Error("boom"), { requestId: "req_1" });
    }).not.toThrow();
    expect(() => {
      tracker.capture(undefined);
    }).not.toThrow();
  });

  it("resolves flush so shutdown paths do not need to know which tracker they hold", async () => {
    await expect(createNoopErrorTracker().flush()).resolves.toBeUndefined();
  });
});
