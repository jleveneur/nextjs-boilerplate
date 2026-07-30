import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formatEnvErrors } from "./format-errors.ts";

describe("formatEnvErrors", () => {
  it("lists every issue, sorted by path", () => {
    const result = z
      .object({
        ZEBRA: z.string(),
        APPLE: z.string(),
      })
      .safeParse({});

    expect(result.success).toBe(false);
    if (result.success) return;

    const message = formatEnvErrors(result.error);

    expect(message.startsWith("Invalid environment variables:")).toBe(true);
    const apple = message.indexOf("APPLE:");
    const zebra = message.indexOf("ZEBRA:");
    expect(apple).toBeGreaterThan(-1);
    expect(zebra).toBeGreaterThan(-1);
    expect(apple).toBeLessThan(zebra);
  });
});
