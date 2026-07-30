import { describe, expect, it } from "vitest";

import { timestampSchema, timestampsSchema } from "./timestamp.ts";

describe("timestampSchema", () => {
  it("accepts RFC 3339 UTC and offset forms", () => {
    for (const value of [
      "2026-07-30T12:00:00Z",
      "2026-07-30T12:00:00.000Z",
      "2026-07-30T12:00:00.123456789Z",
      "2026-07-30T14:00:00+02:00",
    ]) {
      expect(timestampSchema.parse(value)).toBe(value);
    }
  });

  it("rejects date-only and space-separated forms", () => {
    expect(() => timestampSchema.parse("2026-07-30")).toThrow();
    expect(() => timestampSchema.parse("2026-07-30 12:00:00")).toThrow();
  });
});

describe("timestampsSchema", () => {
  it("requires createdAt and updatedAt", () => {
    expect(
      timestampsSchema.parse({
        createdAt: "2026-07-30T12:00:00.000Z",
        updatedAt: "2026-07-30T12:00:00.000Z",
      }),
    ).toMatchObject({
      createdAt: "2026-07-30T12:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    });
  });

  it("allows a null deletedAt", () => {
    expect(
      timestampsSchema.parse({
        createdAt: "2026-07-30T12:00:00.000Z",
        updatedAt: "2026-07-30T12:00:00.000Z",
        deletedAt: null,
      }).deletedAt,
    ).toBeNull();
  });
});
