import { describe, expect, it } from "vitest";

import { bootstrapFlags } from "./bootstrap.ts";
import { createStaticFlagProvider } from "./static-provider.ts";

describe("bootstrapFlags", () => {
  it("returns every registered flag", async () => {
    const provider = createStaticFlagProvider({
      "new-billing-portal": true,
      "disable-exports": false,
    });
    const bootstrapped = await bootstrapFlags(provider);
    expect(bootstrapped["new-billing-portal"]).toBe(true);
    expect(bootstrapped["disable-exports"]).toBe(false);
  });
});
