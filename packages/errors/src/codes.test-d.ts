/**
 * Type assertions for error codes.
 *
 * Branding is the only thing stopping a free string from being passed where a
 * stable code is required. If this file passes with the brand removed, every
 * call site that should be using defineErrorCode is unprotected.
 */

import { assertType, describe, expectTypeOf, it } from "vitest";

import { defineErrorCode, ERROR_CODES, type ErrorCode } from "./codes.ts";

describe("ErrorCode", () => {
  it("rejects a plain string", () => {
    // @ts-expect-error a free string is not an ErrorCode
    assertType<ErrorCode>("NOT_A_CODE");
  });

  it("accepts defineErrorCode and the built-in registry", () => {
    expectTypeOf(defineErrorCode("INVOICE_ALREADY_PAID")).toExtend<ErrorCode>();
    expectTypeOf(ERROR_CODES.NOT_FOUND).toExtend<ErrorCode>();
  });

  it("preserves the literal through defineErrorCode", () => {
    // So a feature can use the literal in a discriminated union of its own codes.
    expectTypeOf(defineErrorCode("INVOICE_ALREADY_PAID")).toEqualTypeOf<
      ErrorCode & "INVOICE_ALREADY_PAID"
    >();
  });
});
