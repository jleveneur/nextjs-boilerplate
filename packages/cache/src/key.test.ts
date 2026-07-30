import { describe, expect, it } from "vitest";

import { buildCacheKey } from "./key.ts";

describe("buildCacheKey", () => {
  it("builds env:namespace:version:key", () => {
    expect(buildCacheKey("local", { namespace: "entitlements", version: 1, key: "plan" })).toBe(
      "local:entitlements:v1:plan",
    );
  });

  it("inserts organization segment when provided", () => {
    expect(
      buildCacheKey("local", {
        namespace: "entitlements",
        version: 2,
        key: "plan",
        organizationId: "01900000-0000-7000-8000-000000000010",
      }),
    ).toBe("local:entitlements:v2:org:01900000-0000-7000-8000-000000000010:plan");
  });

  it("rejects empty segments and colons", () => {
    expect(() => buildCacheKey("", { namespace: "n", version: 0, key: "k" })).toThrow(/appEnv/);
    expect(() => buildCacheKey("local", { namespace: "bad:ns", version: 0, key: "k" })).toThrow(
      /namespace/,
    );
    expect(() => buildCacheKey("local", { namespace: "n", version: -1, key: "k" })).toThrow(
      /version/,
    );
  });
});
