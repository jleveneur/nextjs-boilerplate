import { describe, expect, it } from "vitest";

import { InternalError, NotFoundError } from "./app-error.ts";
import { normalizeError } from "./normalize.ts";

describe("normalizeError", () => {
  it("returns an AppError unchanged", () => {
    const error = new NotFoundError({ resource: "project", id: "p_1" });

    expect(normalizeError(error)).toBe(error);
  });

  it("maps an invariant violation to InternalError", () => {
    // The same-layer seam: utils names the error InvariantViolation, we recognise
    // it here. If this mapping breaks, invariant failures become silent 500s with
    // no Sentry report — or worse, get exposed.
    const invariant = new Error("member vanished");
    invariant.name = "InvariantViolation";

    const normalized = normalizeError(invariant);

    expect(normalized).toBeInstanceOf(InternalError);
    expect(normalized.message).toBe("member vanished");
    expect(normalized.cause).toBe(invariant);
    expect(normalized.severity).toBe("unexpected");
    expect(normalized.expose).toBe(false);
  });

  it("wraps an ordinary Error as InternalError without leaking its message", () => {
    // A vendor SDK error's message is not safe for clients. The wrapper's message
    // is generic; the original is in cause and context for logs.
    const original = new Error("ECONNREFUSED 10.0.0.5:5432");
    const normalized = normalizeError(original);

    expect(normalized).toBeInstanceOf(InternalError);
    expect(normalized.message).toBe("Unexpected error");
    expect(normalized.message).not.toContain("10.0.0.5");
    expect(normalized.cause).toBe(original);
    expect(normalized.context).toMatchObject({
      originalName: "Error",
      originalMessage: "ECONNREFUSED 10.0.0.5:5432",
    });
  });

  it("wraps a thrown non-Error value", () => {
    // `throw "boom"` and `throw null` still happen. typeof is all we can usefully
    // record without risking a large or cyclic value in context.
    const normalized = normalizeError("boom");

    expect(normalized).toBeInstanceOf(InternalError);
    expect(normalized.cause).toBe("boom");
    expect(normalized.context).toStrictEqual({ thrownType: "string" });
  });

  it("does not treat a differently-named Error as an invariant", () => {
    const error = new Error("looks similar");
    error.name = "InvariantError";

    const normalized = normalizeError(error);

    expect(normalized.message).toBe("Unexpected error");
    expect(normalized.message).not.toBe("looks similar");
  });
});
