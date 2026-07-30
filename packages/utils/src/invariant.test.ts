import { describe, expect, expectTypeOf, it } from "vitest";

import { INVARIANT_VIOLATION_NAME, invariant } from "./invariant.ts";

describe("invariant", () => {
  it("does nothing when the condition holds", () => {
    expect(() => {
      invariant(true, "unreachable");
    }).not.toThrow();
  });

  it("throws with the given message", () => {
    // The message is the entire diagnostic value of the throw, so it has to
    // survive verbatim rather than being wrapped in boilerplate.
    expect(() => {
      invariant(false, "member 42 vanished mid-transaction");
    }).toThrow("member 42 vanished mid-transaction");
  });

  it("throws an error the mapper can recognise by name", () => {
    // @repo/errors is the same layer and unreachable from here, so the name is the
    // seam the error mapper matches on to produce an InternalError. Asserted
    // because renaming it silently reclassifies every invariant failure as an
    // unknown 500.
    expect(() => {
      invariant(false, "boom");
    }).toThrowError(expect.objectContaining({ name: INVARIANT_VIOLATION_NAME }));
  });

  it("treats falsy-but-valid values as failures", () => {
    // The trap in every hand-rolled version of this: `if (!condition)` is what we
    // want for null and undefined, and it also fires for 0 and "". A caller
    // asserting on a count must write `count !== undefined`, so this pins the
    // behaviour rather than pretending it is surprising.
    for (const falsy of [0, "", Number.NaN, null, undefined, false]) {
      expect(() => {
        invariant(falsy, "falsy");
      }).toThrow();
    }
  });

  it("accepts truthy values of any type", () => {
    for (const truthy of [1, "a", [], {}, true, () => {}]) {
      expect(() => {
        invariant(truthy, "truthy");
      }).not.toThrow();
    }
  });

  it("narrows the asserted value for the rest of the scope", () => {
    // The reason this exists rather than `if (!x) throw`: the narrowing is what
    // replaces the non-null assertion operator. Without `asserts condition` the
    // helper is just a throw and every call site still needs `!`.
    const member: { role: string } | undefined = { role: "admin" };

    invariant(member, "member is present");

    expectTypeOf(member).toEqualTypeOf<{ role: string }>();
    expect(member.role).toBe("admin");
  });
});
