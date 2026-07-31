import { describe, expect, it } from "vitest";

import { derivativeObjectKey } from "./derivative-key.ts";

describe("derivativeObjectKey", () => {
  it("replaces the extension beside the original key", () => {
    expect(derivativeObjectKey("test/org/asset/id/photo.jpg", "webp")).toBe(
      "test/org/asset/id/photo.webp",
    );
    expect(derivativeObjectKey("test/org/asset/id/photo.jpg", "avif")).toBe(
      "test/org/asset/id/photo.avif",
    );
  });

  it("appends the format when the filename has no extension", () => {
    expect(derivativeObjectKey("test/org/asset/id/photo", "webp")).toBe(
      "test/org/asset/id/photo.webp",
    );
  });
});
