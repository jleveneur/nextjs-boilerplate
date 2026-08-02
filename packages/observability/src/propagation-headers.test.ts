import { describe, expect, it } from "vitest";

import { getPropagationHeaders } from "./propagation-headers.ts";

describe("getPropagationHeaders", () => {
  it("returns an empty object when no span is active", () => {
    expect(getPropagationHeaders()).toEqual({});
  });

  it("returns string header values when propagation injects", () => {
    const headers = getPropagationHeaders();
    for (const value of Object.values(headers)) {
      expect(typeof value).toBe("string");
    }
  });
});
