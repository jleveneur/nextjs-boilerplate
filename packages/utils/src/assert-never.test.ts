import { describe, expect, it } from "vitest";

import { assertNever } from "./assert-never.ts";
import { INVARIANT_VIOLATION_NAME } from "./invariant.ts";

/**
 * Reaching `assertNever` requires a value the compiler believes is impossible, so
 * every test here casts through `never`. That cast is the test: it stands in for
 * the boundary where the type stopped being true — a new database enum member, an
 * older client's payload.
 */
const unexpected = (value: unknown): never => value as never;

/** Named so `describe` can assert the function's name appears in the message. */
function namedHandler() {}

describe("assertNever", () => {
  it("throws when reached", () => {
    expect(() => assertNever(unexpected("cancelled"))).toThrow();
  });

  it("names the subject and the value", () => {
    // Both halves matter: the subject says which switch, the value says which
    // variant. "Unhandled variant" alone means grepping for switches.
    expect(() => assertNever(unexpected("cancelled"), "subscription status")).toThrow(
      'Unhandled subscription status: "cancelled"',
    );
  });

  it("throws an error the mapper can recognise by name", () => {
    expect(() => assertNever(unexpected("x"))).toThrowError(
      expect.objectContaining({ name: INVARIANT_VIOLATION_NAME }),
    );
  });

  it("describes an unexpected object by shape, not as [object Object]", () => {
    // A value arriving here is by definition not what the types promised, and it
    // is often an object when a discriminant was expected. Keys, not values: the
    // message reaches logs and the object may carry personal data.
    expect(() => assertNever(unexpected({ id: 1, email: "a@b.test" }), "row")).toThrow(
      "Unhandled row: Object { id, email }",
    );
  });

  it("does not put field values in the message", () => {
    // Guarding the redaction property directly, because the obvious "improvement"
    // to the previous test is to JSON.stringify the whole object.
    let message = "";
    try {
      assertNever(unexpected({ email: "leaked@example.test" }));
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).not.toContain("leaked@example.test");
  });

  it("handles values with no constructor or keys", () => {
    expect(() => assertNever(unexpected(null))).toThrow("Unhandled variant: null");
    expect(() => assertNever(unexpected(undefined))).toThrow("Unhandled variant: undefined");
    expect(() => assertNever(unexpected(Object.create(null)))).toThrow("Unhandled variant: object");
    expect(() => assertNever(unexpected({}))).toThrow("Unhandled variant: Object");
  });

  it("handles non-string primitives", () => {
    expect(() => assertNever(unexpected(7))).toThrow("Unhandled variant: 7");
    expect(() => assertNever(unexpected(false))).toThrow("Unhandled variant: false");
    expect(() => assertNever(unexpected(7n))).toThrow("Unhandled variant: 7");
    expect(() => assertNever(unexpected(Symbol("s")))).toThrow("Unhandled variant: Symbol(s)");
  });

  it("names a function rather than rendering its source", () => {
    // Functions convert to their source under String(), which is long and useless
    // as a discriminant. The name alone identifies which one arrived.
    expect(() => assertNever(unexpected(namedHandler))).toThrow(
      "Unhandled variant: function namedHandler",
    );
    expect(() => assertNever(unexpected(() => {}))).toThrow(
      "Unhandled variant: function anonymous",
    );
  });
});
