import { describe, expect, it } from "vitest";

import { entitlementKeysFromMetadata } from "./entitlements.ts";

describe("entitlementKeysFromMetadata", () => {
  it("parses comma-separated keys", () => {
    expect(entitlementKeysFromMetadata({ entitlements: "billing:pro, exports:enabled" })).toEqual([
      "billing:pro",
      "exports:enabled",
    ]);
  });

  it("returns empty for missing metadata", () => {
    expect(entitlementKeysFromMetadata(undefined)).toEqual([]);
    expect(entitlementKeysFromMetadata({})).toEqual([]);
  });
});
