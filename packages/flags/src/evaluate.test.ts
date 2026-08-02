import { describe, expect, it } from "vitest";

import { resolveFlag } from "./evaluate.ts";
import { createEnvFlagProvider } from "./env-provider.ts";
import { listExpiredFlags } from "./expiry.ts";
import { createStaticFlagProvider } from "./static-provider.ts";
import type { FlagProvider } from "./types.ts";

describe("resolveFlag", () => {
  it("returns the provider value when evaluation succeeds", async () => {
    const provider = createStaticFlagProvider({ "new-billing-portal": true });

    await expect(resolveFlag(provider, "new-billing-portal")).resolves.toBe(true);
  });

  it("fails open to the registry default when the provider throws", async () => {
    const provider: FlagProvider = {
      isEnabled() {
        return Promise.reject(new Error("posthog down"));
      },
    };

    await expect(resolveFlag(provider, "new-billing-portal")).resolves.toBe(false);
    await expect(resolveFlag(provider, "disable-exports")).resolves.toBe(false);
  });
});

describe("createStaticFlagProvider", () => {
  it("returns explicit Record overrides", async () => {
    const provider = createStaticFlagProvider({ "disable-exports": true });

    await expect(provider.isEnabled("disable-exports")).resolves.toBe(true);
    await expect(provider.isEnabled("new-billing-portal")).resolves.toBe(false);
  });

  it("returns explicit Map overrides", async () => {
    const provider = createStaticFlagProvider(new Map([["new-billing-portal", true]]));

    await expect(provider.isEnabled("new-billing-portal")).resolves.toBe(true);
  });
});

describe("createEnvFlagProvider", () => {
  it("parses the FLAGS_JSON blob", async () => {
    const provider = createEnvFlagProvider({
      flagsJson: JSON.stringify({ "new-billing-portal": true }),
    });

    await expect(provider.isEnabled("new-billing-portal")).resolves.toBe(true);
    await expect(provider.isEnabled("disable-exports")).resolves.toBe(false);
  });

  it("merges values over flagsJson", async () => {
    const provider = createEnvFlagProvider({
      flagsJson: JSON.stringify({ "new-billing-portal": true }),
      values: { "new-billing-portal": false },
    });

    await expect(provider.isEnabled("new-billing-portal")).resolves.toBe(false);
  });
});

describe("listExpiredFlags", () => {
  it("lists release flags past their expires date", () => {
    const expired = listExpiredFlags(new Date("2028-01-01T00:00:00.000Z"));

    expect(expired).toEqual([
      {
        name: "new-billing-portal",
        expires: "2027-12-31",
        owner: "@platform",
        kind: "release",
      },
    ]);
  });

  it("does not list flags still within their window", () => {
    expect(listExpiredFlags(new Date("2027-12-31T12:00:00.000Z"))).toEqual([]);
  });

  it("never lists kill-switches", () => {
    const expired = listExpiredFlags(new Date("2099-01-01T00:00:00.000Z"));
    expect(expired.some((flag) => flag.name === "disable-exports")).toBe(false);
  });
});
