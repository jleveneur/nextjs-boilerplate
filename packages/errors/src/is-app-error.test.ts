import { describe, expect, it } from "vitest";

import { InternalError, NotFoundError } from "./app-error.ts";
import { isAppError } from "./is-app-error.ts";

describe("isAppError", () => {
  it("accepts hierarchy instances", () => {
    expect(isAppError(new NotFoundError({ resource: "project" }))).toBe(true);
    expect(isAppError(new InternalError())).toBe(true);
  });

  it("rejects plain errors and other values", () => {
    // The mapper's first branch. A false positive would skip normalizeError and
    // leak an untyped error into the response path.
    expect(isAppError(new Error("nope"))).toBe(false);
    expect(isAppError({ code: "NOT_FOUND" })).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError("NOT_FOUND")).toBe(false);
  });
});
