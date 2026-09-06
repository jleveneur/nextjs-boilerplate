import { describe, expect, it, vi } from "vitest";

const { registered } = vi.hoisted(() => ({
  registered: {
    "expired-release": {
      kind: "release" as const,
      default: false,
      owner: "platform",
      expires: "2020-01-01",
    },
    "current-release": {
      kind: "release" as const,
      default: true,
      owner: "platform",
      expires: "2099-12-31",
    },
    "kill-switch": {
      kind: "kill-switch" as const,
      default: false,
      owner: "platform",
    },
  },
}));

vi.mock("./registry.ts", () => {
  function hasFlagName(name: string): name is keyof typeof registered {
    return Object.hasOwn(registered, name);
  }

  function getFlagDefinition(name: string) {
    return hasFlagName(name) ? registered[name] : undefined;
  }

  return {
    flags: registered,
    hasFlagName,
    getFlagDefinition,
  };
});

import { bootstrapFlags } from "./bootstrap.ts";
import { resolveFlag } from "./evaluate.ts";
import { listExpiredFlags } from "./expiry.ts";
import { createStaticFlagProvider } from "./static-provider.ts";

describe("resolveFlag", () => {
  it("asks the provider for a registered flag", async () => {
    const provider = createStaticFlagProvider({ "current-release": false });
    await expect(resolveFlag(provider, "current-release")).resolves.toBe(false);
  });

  it("fails open to the declared default when the provider throws", async () => {
    const provider = {
      isEnabled: () => Promise.reject(new Error("provider down")),
    };

    await expect(resolveFlag(provider, "current-release")).resolves.toBe(true);
    await expect(resolveFlag(provider, "expired-release")).resolves.toBe(false);
  });

  it("rejects names that are not in the registry", async () => {
    const provider = createStaticFlagProvider({});
    await expect(resolveFlag(provider, "missing")).rejects.toThrow(/Unknown feature flag/);
  });
});

describe("bootstrapFlags", () => {
  it("resolves every registered flag", async () => {
    const provider = createStaticFlagProvider({ "current-release": false });
    await expect(bootstrapFlags(provider)).resolves.toEqual({
      "expired-release": false,
      "current-release": false,
      "kill-switch": false,
    });
  });
});

describe("listExpiredFlags", () => {
  it("lists non-permanent flags whose expiry day has passed", () => {
    expect(listExpiredFlags(new Date("2021-01-01T00:00:00.000Z"))).toEqual([
      {
        name: "expired-release",
        expires: "2020-01-01",
        owner: "platform",
        kind: "release",
      },
    ]);
  });

  it("skips flags that are still within their expiry window", () => {
    expect(listExpiredFlags(new Date("2019-01-01T00:00:00.000Z"))).toEqual([]);
  });
});
