import { describe, expect, it } from "vitest";

import { createEnvFlagProvider } from "./env-provider.ts";
import { resolveFlag } from "./evaluate.ts";
import { listExpiredFlags } from "./expiry.ts";
import { hasFlagName } from "./registry.ts";
import { createStaticFlagProvider } from "./static-provider.ts";

describe("hasFlagName", () => {
  it("rejects names that are not in the empty registry", () => {
    expect(hasFlagName("new-billing-portal")).toBe(false);
    expect(hasFlagName("disable-exports")).toBe(false);
  });
});

describe("createStaticFlagProvider", () => {
  it("returns explicit Record overrides and false for unknown names", async () => {
    const provider = createStaticFlagProvider({ "any-flag": true });

    await expect(provider.isEnabled("any-flag")).resolves.toBe(true);
    await expect(provider.isEnabled("missing")).resolves.toBe(false);
  });
});

describe("createEnvFlagProvider", () => {
  it("parses the FLAGS_JSON blob", async () => {
    const provider = createEnvFlagProvider({
      flagsJson: JSON.stringify({ "any-flag": true }),
    });

    await expect(provider.isEnabled("any-flag")).resolves.toBe(true);
    await expect(provider.isEnabled("missing")).resolves.toBe(false);
  });

  it("merges values over flagsJson", async () => {
    const provider = createEnvFlagProvider({
      flagsJson: JSON.stringify({ "any-flag": true }),
      values: { "any-flag": false },
    });

    await expect(provider.isEnabled("any-flag")).resolves.toBe(false);
  });
});

describe("listExpiredFlags", () => {
  it("is empty when the registry has no release flags", () => {
    expect(listExpiredFlags(new Date("2099-01-01T00:00:00.000Z"))).toEqual([]);
  });
});

describe("resolveFlag", () => {
  it("rejects names that are not in the empty registry", async () => {
    const provider = createStaticFlagProvider({});
    await expect(resolveFlag(provider, "missing")).rejects.toThrow(/Unknown feature flag/);
  });
});
