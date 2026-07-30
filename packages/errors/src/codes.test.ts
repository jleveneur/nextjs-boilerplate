import { describe, expect, it } from "vitest";

import { defineErrorCode, ERROR_CODES } from "./codes.ts";

describe("defineErrorCode", () => {
  it("returns the same string at runtime", () => {
    // Branding is a type-level fiction. At runtime a code is the string clients
    // match on, so identity must be preserved.
    expect(defineErrorCode("INVOICE_ALREADY_PAID")).toBe("INVOICE_ALREADY_PAID");
  });
});

describe("ERROR_CODES", () => {
  it("exposes every hierarchy code", () => {
    // A missing entry here means a subclass is shipping without a stable code,
    // which breaks the client contract before anyone notices.
    expect(Object.keys(ERROR_CODES).toSorted()).toStrictEqual([
      "CONFLICT",
      "EXTERNAL_SERVICE_FAILED",
      "FORBIDDEN",
      "INTERNAL",
      "NOT_FOUND",
      "RATE_LIMITED",
      "UNAUTHORIZED",
      "VALIDATION_FAILED",
    ]);

    for (const code of Object.values(ERROR_CODES)) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});
