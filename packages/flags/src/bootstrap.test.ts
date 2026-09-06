import { describe, expect, it } from "vitest";

import { bootstrapFlags } from "./bootstrap.ts";
import { createStaticFlagProvider } from "./static-provider.ts";

describe("bootstrapFlags", () => {
  it("returns an empty object when no flags are registered", async () => {
    const provider = createStaticFlagProvider({});
    const bootstrapped = await bootstrapFlags(provider);
    expect(bootstrapped).toEqual({});
  });
});
