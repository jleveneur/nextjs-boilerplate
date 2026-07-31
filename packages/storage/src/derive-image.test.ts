import { describe, expect, it } from "vitest";

import { deriveImageVariants } from "./derive-image.ts";

/** Minimal 1×1 PNG. */
const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

describe("deriveImageVariants", () => {
  it("produces webp and avif bytes from a png", async () => {
    const variants = await deriveImageVariants(PNG_1X1);
    expect(variants.webp.body.byteLength).toBeGreaterThan(0);
    expect(variants.webp.contentType).toBe("image/webp");
    expect(variants.avif.body.byteLength).toBeGreaterThan(0);
    expect(variants.avif.contentType).toBe("image/avif");
  });
});
